import type { Metadata } from "next";
import { HomeView } from "@/features/home/home-view";

export const metadata: Metadata = {
  title: "Home — Mianatra Manisa",
};

export default function HomePage() {
  return <HomeView />;
}
