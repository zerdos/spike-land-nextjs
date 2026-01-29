"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBriefStore } from "@/lib/store/brief";
import { targetAudienceSchema } from "@/lib/validation/brief";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface TargetAudienceStepProps {
  onValidChange: (isValid: boolean) => void;
}

export function TargetAudienceStep({ onValidChange }: TargetAudienceStepProps) {
  const { targetAudience, setTargetAudience } = useBriefStore();

  const [ageRange, setAgeRange] = useState(targetAudience.demographics?.ageRange || "");
  const [gender, setGender] = useState(targetAudience.demographics?.gender || "");
  const [location, setLocation] = useState(targetAudience.demographics?.location || "");
  const [interests, setInterests] = useState<string[]>(targetAudience.interests || []);
  const [behaviors, setBehaviors] = useState<string[]>(targetAudience.behaviors || []);
  const [interestInput, setInterestInput] = useState("");
  const [behaviorInput, setBehaviorInput] = useState("");

  useEffect(() => {
    const data = {
      demographics: { ageRange, gender, location },
      interests,
      behaviors,
    };

    const result = targetAudienceSchema.safeParse(data);
    onValidChange(result.success);

    if (result.success) {
      setTargetAudience(data);
    }
  }, [ageRange, gender, location, interests, behaviors, onValidChange, setTargetAudience]);

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const addBehavior = () => {
    if (behaviorInput.trim() && !behaviors.includes(behaviorInput.trim())) {
      setBehaviors([...behaviors, behaviorInput.trim()]);
      setBehaviorInput("");
    }
  };

  const removeBehavior = (behavior: string) => {
    setBehaviors(behaviors.filter((b) => b !== behavior));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Demographics</h3>

        <div className="space-y-2">
          <Label htmlFor="ageRange">Age Range</Label>
          <Input
            id="ageRange"
            placeholder="e.g., 25-34"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Input
            id="gender"
            placeholder="e.g., All, Male, Female, Non-binary"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g., United States, New York City"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Interests</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Add an interest (e.g., Technology, Fitness)"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge key={interest} variant="secondary">
              {interest}
              <button
                onClick={() => removeInterest(interest)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Behaviors</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Add a behavior (e.g., Online Shoppers, Early Adopters)"
            value={behaviorInput}
            onChange={(e) => setBehaviorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBehavior();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {behaviors.map((behavior) => (
            <Badge key={behavior} variant="secondary">
              {behavior}
              <button
                onClick={() => removeBehavior(behavior)}
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
