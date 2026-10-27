import SplashAnimada from "@/components/common/SplashAnimada";
import { useAuth } from "@/context/AuthProvider";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

const ABERTURA_MS = 1800;

export default function Index() {
  const { user, loading } = useAuth();
  const [aberturaTerminou, setAberturaTerminou] = useState(false);

  useEffect(() => {
    const fim = setTimeout(() => setAberturaTerminou(true), ABERTURA_MS);
    return () => clearTimeout(fim);
  }, []);

  if (loading || !aberturaTerminou) return <SplashAnimada />;

  // Se já estiver autenticado, vai para home, senão para login
  return <Redirect href={user ? "/home" : "/login"} />;
}
