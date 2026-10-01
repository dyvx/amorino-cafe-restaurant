"use client";

import React from "react";
import { AmorinoLogo } from "./AmorinoLogo";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-obsidian text-crema flex flex-col items-center justify-center p-6 text-center">
          <AmorinoLogo size={88} ringGlow className="mb-6" />
          <h2 className="font-serif text-3xl text-crema mb-2">
            Something went wrong.
          </h2>
          <p className="text-champagne text-sm max-w-md mb-6">
            Please try again.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-6 py-3 rounded-full bg-gold text-obsidian font-medium text-sm tracking-wide hover:bg-gold-light transition"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
