import type { Metadata } from "next";
import { HomeView } from "./_components/home-view";

export const metadata: Metadata = {
  title: "Home — Mianatra Manisa",
};

export default function HomePage() {
  return <HomeView />;
}
