function getInitials(name: string, length = 2): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= length) {
    return words.slice(0, length).map((w) => w[0]).join("").toUpperCase()
  }
  return name.slice(0, length).toUpperCase()
}

export { getInitials }
