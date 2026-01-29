"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBriefStore } from "@/lib/store/brief";
import { creativeRequirementsSchema } from "@/lib/validation/brief";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface CreativeRequirementsStepProps {
  onValidChange: (isValid: boolean) => void;
}

const platformOptions = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter / X" },
] as const;

const formatOptions = [
  { value: "IMAGE", label: "Static Image" },
  { value: "VIDEO", label: "Video" },
  { value: "CAROUSEL", label: "Carousel" },
  { value: "STORY", label: "Story" },
] as const;

export function CreativeRequirementsStep({ onValidChange }: CreativeRequirementsStepProps) {
  const { creativeRequirements, setCreativeRequirements } = useBriefStore();

  const [platforms, setPlatforms] = useState<("FACEBOOK" | "INSTAGRAM" | "GOOGLE_ADS" | "LINKEDIN" | "TWITTER")[]>(creativeRequirements.platforms || []);
  const [formats, setFormats] = useState<("IMAGE" | "VIDEO" | "CAROUSEL" | "STORY")[]>(creativeRequirements.formats || []);
  const [toneOfVoice, setToneOfVoice] = useState(creativeRequirements.toneOfVoice || "");
  const [brandGuidelines, setBrandGuidelines] = useState(creativeRequirements.brandGuidelines || "");
  const [colorPalette, setColorPalette] = useState<string[]>(creativeRequirements.colorPalette || []);
  const [mustInclude, setMustInclude] = useState<string[]>(creativeRequirements.mustInclude || []);
  const [mustAvoid, setMustAvoid] = useState<string[]>(creativeRequirements.mustAvoid || []);
  const [colorInput, setColorInput] = useState("");
  const [includeInput, setIncludeInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");

  useEffect(() => {
    const data = {
      platforms,
      formats,
      toneOfVoice,
      brandGuidelines,
      colorPalette,
      mustInclude,
      mustAvoid,
    };

    const result = creativeRequirementsSchema.safeParse(data);
    onValidChange(result.success);

    if (result.success) {
      setCreativeRequirements(data);
    }
  }, [platforms, formats, toneOfVoice, brandGuidelines, colorPalette, mustInclude, mustAvoid, onValidChange, setCreativeRequirements]);

  const togglePlatform = (platform: "FACEBOOK" | "INSTAGRAM" | "GOOGLE_ADS" | "LINKEDIN" | "TWITTER") => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter((p) => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const toggleFormat = (format: "IMAGE" | "VIDEO" | "CAROUSEL" | "STORY") => {
    if (formats.includes(format)) {
      setFormats(formats.filter((f) => f !== format));
    } else {
      setFormats([...formats, format]);
    }
  };

  const addColor = () => {
    if (colorInput.trim() && !colorPalette.includes(colorInput.trim())) {
      setColorPalette([...colorPalette, colorInput.trim()]);
      setColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setColorPalette(colorPalette.filter((c) => c !== color));
  };

  const addMustInclude = () => {
    if (includeInput.trim() && !mustInclude.includes(includeInput.trim())) {
      setMustInclude([...mustInclude, includeInput.trim()]);
      setIncludeInput("");
    }
  };

  const removeMustInclude = (item: string) => {
    setMustInclude(mustInclude.filter((i) => i !== item));
  };

  const addMustAvoid = () => {
    if (avoidInput.trim() && !mustAvoid.includes(avoidInput.trim())) {
      setMustAvoid([...mustAvoid, avoidInput.trim()]);
      setAvoidInput("");
    }
  };

  const removeMustAvoid = (item: string) => {
    setMustAvoid(mustAvoid.filter((i) => i !== item));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Target Platforms *</Label>
        <div className="grid grid-cols-2 gap-4">
          {platformOptions.map((platform) => (
            <div key={platform.value} className="flex items-center space-x-2">
              <Checkbox
                id={platform.value}
                checked={platforms.includes(platform.value)}
                onCheckedChange={() => togglePlatform(platform.value)}
              />
              <label
                htmlFor={platform.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {platform.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Creative Formats *</Label>
        <div className="grid grid-cols-2 gap-4">
          {formatOptions.map((format) => (
            <div key={format.value} className="flex items-center space-x-2">
              <Checkbox
                id={format.value}
                checked={formats.includes(format.value)}
                onCheckedChange={() => toggleFormat(format.value)}
              />
              <label
                htmlFor={format.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {format.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="toneOfVoice">Tone of Voice *</Label>
        <Input
          id="toneOfVoice"
          placeholder="e.g., Professional, Friendly, Energetic"
          value={toneOfVoice}
          onChange={(e) => setToneOfVoice(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brandGuidelines">Brand Guidelines (Optional)</Label>
        <Textarea
          id="brandGuidelines"
          placeholder="Include any specific brand guidelines, style requirements, or messaging rules"
          value={brandGuidelines}
          onChange={(e) => setBrandGuidelines(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-4">
        <Label>Color Palette (Optional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a color (e.g., #FF5733 or Brand Blue)"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {colorPalette.map((color) => (
            <Badge key={color} variant="secondary">
              {color}
              <button
                onClick={() => removeColor(color)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Must Include (Optional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Elements that must be included (e.g., Logo, Tagline)"
            value={includeInput}
            onChange={(e) => setIncludeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMustInclude();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {mustInclude.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
              <button
                onClick={() => removeMustInclude(item)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Must Avoid (Optional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Things to avoid (e.g., Competitor mentions, Certain topics)"
            value={avoidInput}
            onChange={(e) => setAvoidInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMustAvoid();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {mustAvoid.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
              <button
                onClick={() => removeMustAvoid(item)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
