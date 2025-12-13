"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Gift,
  MapPin,
  Snowflake,
  Sparkles,
  Star,
  TreePine,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price: string;
  featured?: boolean;
}

function EventCard({
  title,
  date,
  time,
  location,
  description,
  price,
  featured = false,
}: EventCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg",
        featured && "border-red-500 border-2 shadow-lg",
      )}
      data-testid={`event-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {featured && (
        <div className="absolute top-4 -right-8 rotate-45 bg-red-500 text-white text-xs py-1 px-8 font-medium">
          Featured
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <CardDescription className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            {date}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            {time}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            {location}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <div className="text-2xl font-bold text-red-600">{price}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className={cn(
            "w-full",
            featured
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-600 hover:bg-green-700",
          )}
          data-testid={`book-button-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Gift className="h-4 w-4 mr-2" />
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ChristmasBrightonPage() {
  const [newsletter, setNewsletter] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-red-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 animate-pulse">
            <Snowflake className="h-16 w-16" />
          </div>
          <div className="absolute top-20 right-20 animate-pulse delay-100">
            <Snowflake className="h-12 w-12" />
          </div>
          <div className="absolute bottom-10 left-1/4 animate-pulse delay-200">
            <Snowflake className="h-20 w-20" />
          </div>
          <div className="absolute top-1/3 right-1/3 animate-pulse delay-300">
            <Snowflake className="h-14 w-14" />
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <TreePine className="h-12 w-12 animate-bounce" />
              <h1
                className="text-5xl md:text-6xl font-bold"
                data-testid="hero-title"
              >
                Christmas in Brighton
              </h1>
              <TreePine className="h-12 w-12 animate-bounce" />
            </div>
            <p className="text-xl md:text-2xl mb-8 text-red-100">
              Experience the magic of the season by the sea
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Badge
                variant="secondary"
                className="text-lg px-4 py-2 bg-white text-red-600"
              >
                <Star className="h-4 w-4 mr-1" />
                December 1st - 31st
              </Badge>
              <Badge
                variant="secondary"
                className="text-lg px-4 py-2 bg-white text-green-600"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Brighton & Hove
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Gift className="h-8 w-8 text-red-600" />
            Festive Events
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join us for magical Christmas celebrations throughout December
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <EventCard
            title="Brighton Christmas Market"
            date="Dec 1-24, 2025"
            time="10:00 AM - 8:00 PM"
            location="Victoria Gardens"
            description="Browse festive stalls featuring local crafts, gifts, and delicious seasonal treats. Perfect for finding unique Christmas presents."
            price="Free Entry"
            featured
          />
          <EventCard
            title="Santa's Grotto Experience"
            date="Dec 5-23, 2025"
            time="11:00 AM - 6:00 PM"
            location="Brighton Pavilion"
            description="Meet Santa in his magical grotto and receive a special gift. Book your slot now for this enchanting experience."
            price="£15 per child"
          />
          <EventCard
            title="Christmas Carol Concert"
            date="Dec 18, 2025"
            time="7:00 PM - 9:00 PM"
            location="St. Peter's Church"
            description="Join us for a traditional carol service featuring local choirs and musicians. Mince pies and mulled wine served after."
            price="£10 adults, £5 children"
          />
          <EventCard
            title="New Year's Eve Fireworks"
            date="Dec 31, 2025"
            time="11:30 PM - 12:30 AM"
            location="Brighton Beach"
            description="Ring in the new year with spectacular fireworks over the sea. A magical Brighton tradition not to be missed!"
            price="Free to attend"
            featured
          />
          <EventCard
            title="Ice Skating Rink"
            date="Dec 1-31, 2025"
            time="10:00 AM - 10:00 PM"
            location="Churchill Square"
            description="Glide across the ice at Brighton's premier outdoor skating rink. Equipment hire included in ticket price."
            price="£12 adults, £8 children"
          />
          <EventCard
            title="Christmas Lights Tour"
            date="Dec 1-31, 2025"
            time="6:00 PM - 8:00 PM"
            location="City Centre"
            description="Guided walking tour of Brighton's stunning Christmas light displays. Hot chocolate included!"
            price="£8 per person"
          />
        </div>
      </section>

      <Separator className="my-8" />

      {/* Special Offers Section */}
      <section className="container mx-auto py-16 px-4 bg-gradient-to-r from-green-50 to-red-50 rounded-lg">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            Special Offers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Exclusive Christmas deals for early birds
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-2 border-yellow-400 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-600" />
                Early Bird Special
              </CardTitle>
              <CardDescription>Book before December 10th</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">
                Get <strong className="text-red-600">20% off</strong> all event
                bookings when you purchase before December 10th. Use code{" "}
                <code className="bg-red-100 px-2 py-1 rounded font-mono text-red-700">
                  EARLYBIRD20
                </code>
              </p>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700"
                data-testid="claim-offer-early-bird"
              >
                Claim Offer
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-400 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TreePine className="h-6 w-6 text-green-600" />
                Family Bundle
              </CardTitle>
              <CardDescription>Perfect for families</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">
                Book 3 or more events and save{" "}
                <strong className="text-green-600">25%</strong> on your total
                booking. Great value for families!
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                data-testid="claim-offer-family-bundle"
              >
                View Bundles
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Newsletter Section */}
      <section className="container mx-auto py-16 px-4">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-red-500 to-green-500 text-white">
          <CardHeader>
            <CardTitle className="text-3xl text-center">
              Stay Updated
            </CardTitle>
            <CardDescription className="text-center text-red-100">
              Subscribe to our newsletter for exclusive offers and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {newsletterSubmitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/20 mb-4">
                  <Gift className="h-8 w-8" />
                </div>
                <p className="text-xl font-semibold">Thank you for subscribing!</p>
                <p className="text-red-100 mt-2">
                  Check your email for a special welcome offer.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="space-y-4"
                data-testid="newsletter-form"
              >
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newsletter}
                    onChange={(e) => setNewsletter(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 rounded-lg text-gray-900"
                    required
                    data-testid="newsletter-input"
                  />
                  <Button
                    type="submit"
                    className="bg-white text-red-600 hover:bg-red-50"
                    data-testid="newsletter-submit"
                  >
                    Subscribe
                  </Button>
                </div>
                <p className="text-xs text-red-100 text-center">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer CTA */}
      <section className="bg-gradient-to-r from-red-600 to-green-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Experience Christmas Magic?
          </h2>
          <p className="text-xl mb-8 text-red-100">
            Book your tickets today and create unforgettable memories
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/pricing">
              <Button
                size="lg"
                className="bg-white text-red-600 hover:bg-red-50"
                data-testid="cta-book-now"
              >
                <Gift className="h-5 w-5 mr-2" />
                Book Now
              </Button>
            </Link>
            <Link href="/apps">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                data-testid="cta-learn-more"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
