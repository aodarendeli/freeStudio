"use client";

import { PROJECTS, type ProjectKey } from "@/lib/projects";

/**
 * Formu GET olarak gönderiyor, action vermiyoruz -> tarayıcı mevcut path'e
 * ?project=... query'siyle gider. Sunucu bileşeni olan sayfalar bunu
 * searchParams'tan okuyup listeleri o projeye göre filtreler. JS gerekmiyor.
 */
export function ProjectSwitcher({ current }: { current: ProjectKey }) {
  return (
    <form className="flex flex-col gap-1 px-4 py-3">
      <label htmlFor="project" className="text-xs font-medium text-muted-foreground">
        Proje
      </label>
      <select
        id="project"
        name="project"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {PROJECTS.map((project) => (
          <option key={project.key} value={project.key}>
            {project.label}
          </option>
        ))}
      </select>
    </form>
  );
}
