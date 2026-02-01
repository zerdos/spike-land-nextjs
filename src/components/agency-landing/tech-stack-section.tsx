"use client";

import { motion } from "framer-motion";
import { JSX } from "react";

interface TechItem {
  name: string;
  icon: JSX.Element;
}

const techStack: TechItem[] = [
  {
    name: "Next.js",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.737 18.312L9.27 7.155H7.72v9.69h1.643V9.068l6.342 9.244h1.032zm1.644-1.928V7.155h-1.644v9.23z" />
      </svg>
    ),
  },
  {
    name: "TypeScript",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zM15.266 9.875h3.188v1.313h-1.078v5.86c0 .546.109.89.328 1.03.219.141.563.141 1.031.063l.281 1.25c-.797.234-1.578.234-2.14.015-.563-.219-.89-.594-1.047-1.125-.109-.375-.141-.937-.141-1.687v-5.406h-.422v-1.313zm-5.719 1.547c.563-.094 1.141-.094 1.703 0l.235 1.25a2.68 2.68 0 00-1.281-.313c-.609 0-1.047.203-1.047.781 0 .406.266.672.937.984l.656.313c.969.453 1.516.984 1.516 1.875 0 1.172-.938 1.844-2.313 1.844-.656 0-1.359-.141-1.922-.375l-.234-1.297c.734.297 1.406.406 1.953.406.75 0 1.063-.313 1.063-.781 0-.469-.266-.75-1.016-1.094l-.578-.266c-1.016-.453-1.516-1.031-1.516-1.89 0-1.188.953-1.781 2.047-1.781z" />
      </svg>
    ),
  },
  {
    name: "React",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.18c.953 0 1.885.068 2.783.196-1.666 1.55-3.376 4.397-4.482 7.56a16.88 16.88 0 00-2.434-.913c.877-2.905 2.37-5.523 4.133-6.843zm-5.42 1.69c.895 2.176 1.34 4.58 1.34 6.94s-.445 4.764-1.34 6.94c-2.456-1.64-4.18-4.14-4.18-6.94s1.724-5.3 4.18-6.94zm8.56 1.258c.703 2.113 1.09 4.352 1.09 6.682s-.387 4.57-1.09 6.683c1.942-1.334 3.19-3.322 3.19-5.513s-1.248-4.18-3.19-5.514v-1.656zm-3.14 3.737c1.47.808 2.656 1.83 3.395 2.87-.74 1.04-1.925 2.062-3.395 2.87-1.47-.808-2.656-1.83-3.395-2.87.74-1.04 1.925-2.062 3.395-2.87z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    name: "Tailwind CSS",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C7.666,17.818,9.027,19.2,12.001,19.2c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" />
      </svg>
    ),
  },
  {
    name: "Framer Motion",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 24l-12-12h12v-12h12l-12 12h12z" />
        <path d="M12 0l-12 12h12v-12z" fillOpacity="0.5"/>
      </svg>
    ),
  },
  {
    name: "OpenAI",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 3.5383-1.9723V13.311l-3.5383 1.9723-2.6732 1.4907a4.5252 4.5252 0 0 1 .4505-1.922 4.4755 4.4755 0 0 1 2.8764-1.0408 3.5937 3.5937 0 0 1 2.0807.5954v4.0186zm-8.8344-7.5501a4.4706 4.4706 0 0 1 .9258-2.8333l.1287.0954 3.5383 1.9723v6.0212l-2.6732-1.4907a4.5204 4.5204 0 0 1-1.9197-2.7649zm12.3732 6.0212l-3.5383-1.9723v-6.0212l2.6732 1.4907a4.5204 4.5204 0 0 1 1.9197 2.7649 4.4706 4.4706 0 0 1-.9258 2.8333l-.1288-.0954zm3.9537-5.5925a4.4755 4.4755 0 0 1-2.8764 1.0408l-.1419.0843-3.5383 1.9723v6.0212l3.5383-1.9723 2.6732-1.4907a4.5252 4.5252 0 0 1-.4505 1.922 4.4755 4.4755 0 0 1-2.8764 1.0408 3.5937 3.5937 0 0 1-2.0807-.5954V15.3078zm1.0549-5.9189l-.1288-.0954-3.5383-1.9723v-6.0212l2.6732 1.4907a4.5204 4.5204 0 0 1 1.9197 2.7649 4.4706 4.4706 0 0 1-.9258 2.8333zM12 10.9788l-2.6732-1.4907-2.6732 1.4907v2.9814l2.6732 1.4907 2.6732-1.4907z"/>
      </svg>
    ),
  },
  {
    name: "Anthropic",
    icon: (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.43 19.37H12.98L12.56 18.28H8.81L8.38 19.37H4.43L10.33 3.63H12.58L17.43 19.37ZM10.68 13.4H11.72L11.19 11.95L10.68 13.4Z"/>
        {/* Placeholder for Anthropic logo - using a stylized A or text representation if complex */}
        <text x="12" y="23" textAnchor="middle" fontSize="4" fill="currentColor">Anthropic</text>
      </svg>
    ),
  },
];

export function TechStackSection() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built with Modern Technologies
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Leveraging the latest tools and frameworks to deliver high-performance, scalable solutions.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16">
          {techStack.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="group flex flex-col items-center justify-center p-4"
            >
              <div className="relative w-16 h-16 md:w-20 md:h-20 mb-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
                {tech.icon}
              </div>
              <span className="text-sm font-medium text-muted-foreground opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                {tech.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
