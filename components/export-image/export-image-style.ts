// Shared paper style for exported PNGs; independent of the dashboard theme.
export const exportImageStyle = {
  width: 1080,
  minHeight: 1520,
  padding: 86,
  colors: {
    paper: "#fbfaf7",
    ink: "#24231f",
    muted: "#77746d",
    rule: "#d8d5ce",
    footer: "#aaa69e",
    recordBackground: "#f3dddd",
  },
  type: {
    title: "700 72px",
    date: "600 29px",
    heading: "700 30px",
    label: "600 27px",
    value: "700 52px",
    footer: "600 24px",
    recordBadge: "700 24px",
  },
} as const
