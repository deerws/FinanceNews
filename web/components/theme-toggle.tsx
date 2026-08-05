"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle("dark", novo);
    localStorage.setItem("leitura-tema", novo ? "dark" : "light");
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={alternar} aria-label="Alternar modo escuro">
      {escuro ? <Sun /> : <Moon />}
    </Button>
  );
}
