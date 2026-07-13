import { getServiceSupabase } from "@/lib/supabase";
import { Package } from "@/lib/types";
import PackagesManager from "../PackagesManager";

export const dynamic = "force-dynamic";

async function getPackages(): Promise<Package[]> {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("name");

  if (error) {
    console.error("Failed to load packages:", error);
    return [];
  }
  return (data ?? []) as Package[];
}

export default async function PackagesPage() {
  const packages = await getPackages();
  return <PackagesManager initial={packages} />;
}
