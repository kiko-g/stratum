export interface Scene {
  id: string
  name: string
  tilesetUrl: string
  location?: string
  description?: string
}

export const SCENES: Scene[] = [
  {
    id: "alpha",
    name: "Alpha",
    description: "Alpha is a 3D model of a city.",
    tilesetUrl: "/data/alpha/tileset.json",
  },
  {
    id: "corujeira",
    name: "Corujeira",
    tilesetUrl: "/data/corujeira/tileset.json",
    location: "Campanhã, Porto, Portugal",
    description: "Modelo 3D da Rua da Corujeira de Baixo, 422",
  },
]

export function getSceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}
