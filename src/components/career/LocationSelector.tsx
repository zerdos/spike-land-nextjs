"use client";

import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCareerStore } from "@/lib/store/career";

export function LocationSelector() {
  const { location } = useCareerStore();
  const { isLoading } = useGeolocation();
  const [manualCity, setManualCity] = useState("");
  const setLocation = useCareerStore((s) => s.setLocation);

  const displayLocation = location
    ? `${location.city}, ${location.country}`
    : isLoading
      ? "Detecting..."
      : "Set location";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-zinc-400 border-white/[0.06]"
        >
          <MapPin className="w-4 h-4" />
          <span className="truncate max-w-[150px]">{displayLocation}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-zinc-900 border-white/[0.06]">
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Override detected location:</p>
          <Input
            placeholder="Enter city name"
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
            className="bg-zinc-800 border-white/[0.06]"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!manualCity.trim()}
            onClick={() => {
              setLocation({
                city: manualCity.trim(),
                country: location?.country ?? "United Kingdom",
                countryCode: location?.countryCode ?? "GB",
                region: "",
                lat: 0,
                lon: 0,
                timezone: location?.timezone ?? "Europe/London",
              });
              setManualCity("");
            }}
          >
            Update Location
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
