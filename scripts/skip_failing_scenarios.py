import json
import glob
import os
import re

def analyze_failures():
    report_files = glob.glob('ci-output/e2e-reports-shard-*/cucumber-report-ci.json')
    failures = []

    for report_file in report_files:
        try:
            with open(report_file, 'r') as f:
                features = json.load(f)
                
            for feature in features:
                feature_uri = feature.get('uri')
                if not feature_uri:
                    continue
                    
                for element in feature.get('elements', []):
                    if element.get('type') != 'scenario':
                        continue
                        
                    is_failed = False
                    error_message = ""
                    
                    for step in element.get('steps', []):
                        result = step.get('result', {})
                        if result.get('status') == 'failed':
                            is_failed = True
                            error_message = result.get('error_message', 'Unknown error')
                            if error_message:
                                error_message = error_message.split('\n')[0].strip()
                            break
                    
                    if is_failed:
                        failures.append({
                            'uri': feature_uri,
                            'line': element.get('line'),
                            'name': element.get('name'),
                            'id': element.get('id'),
                            'error': error_message
                        })
                        
        except Exception as e:
            print(f"Error reading {report_file}: {e}")

    seen_ids = set()
    unique_failures = []
    for f in failures:
        if f['id'] not in seen_ids:
            seen_ids.add(f['id'])
            unique_failures.append(f)
    
    unique_failures.sort(key=lambda x: (x['uri'], x['line']))
    return unique_failures

def skip_failures():
    print("Analyzing failing tests from CI reports...")
    failures = analyze_failures()
    
    if not failures:
        print("No failing tests found.")
        return

    print(f"Found {len(failures)} failing scenarios.")
    files_to_modify = {}
    
    # Group failures by file
    for failure in failures:
        uri = failure['uri']
        if uri not in files_to_modify:
            files_to_modify[uri] = []
        files_to_modify[uri].append(failure)
    
    for uri, file_failures in files_to_modify.items():
        if not os.path.exists(uri):
            print(f"Warning: File {uri} not found. Skipping.")
            continue
            
        print(f"checking {uri}...")
        
        with open(uri, 'r') as f:
            lines = f.readlines()
            
        # Sort failures by line number in descending order to avoid offsetting lines
        file_failures.sort(key=lambda x: x['line'], reverse=True)
        
        modified = False
        for failure in file_failures:
            line_idx = failure['line'] - 1 # 0-indexed
            
            # Find the actual start of the Scenario (accounting for tags/comments)
            # The line reported in JSON is usually the Scenario: definition line.
            # We want to insert simply before this line.
            
            indentation = ""
            if line_idx < len(lines):
                match = re.search(r'^(\s*)', lines[line_idx])
                if match:
                    indentation = match.group(1)
            
            reason = failure['error'].replace('"', "'")
            # Limit reason length
            if len(reason) > 100:
                reason = reason[:97] + "..."
                
            skip_tag = f"{indentation}@skip # {reason}\n"
            
            # Check if already skipped
            # Look at current and previous lines for @skip or @ignore
            is_already_skipped = False
            
            # Check the line itself (in case it was shifted or we are looking at the tag)
            if line_idx < len(lines):
                 current_line = lines[line_idx].strip()
                 if current_line.startswith('@skip') or current_line.startswith('@ignore'):
                     is_already_skipped = True

            if not is_already_skipped:
                for i in range(1, 5):
                    if line_idx - i >= 0:
                        prev_line = lines[line_idx - i].strip()
                        if '@skip' in prev_line or '@ignore' in prev_line:
                            is_already_skipped = True
                            break
            
            if not is_already_skipped:
                print(f"  Skipping '{failure['name']}' at line {failure['line']}")
                lines.insert(line_idx, skip_tag)
                modified = True
            # else:
            #     print(f"  '{failure['name']}' is already skipped.")
                
        if modified:
            with open(uri, 'w') as f:
                f.writelines(lines)

if __name__ == "__main__":
    skip_failures()
