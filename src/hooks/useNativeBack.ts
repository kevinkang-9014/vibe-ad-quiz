"use client";

import { useEffect } from "react";
import { getBridge, setupNativeBack } from "@/lib/bridge";

export function useNativeBack() {
  useEffect(() => {
    return setupNativeBack(() => {
      getBridge().closeWebview();
    });
  }, []);
}
