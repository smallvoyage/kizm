"use server"

import { updateTag } from "next/cache"

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"

export async function refreshFitnessLogs() {
  updateTag(FITNESS_LOGS_CACHE_TAG)
}
