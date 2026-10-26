// Shared palette for every sprite. Hue-shifted ramps (pxl shades): cool saturated shadows,
// warm pale lights. Keys are what the tracer writes and what the hand-drawn parts use.
pal({ z: "#1a0f1e" })                                            // ink: outer silhouette
// her
shades("abcd", "#f0c3a4", { spread: 0.46, shift: 12, sat: 0.6 }) // skin, dark -> light
pal({ e: "#fff4ea", o: "#a45e52", n: "#2a1820", l: "#2b1b2b", L: "#4a3047" })
shades("fghi", "#e8ab9f", { spread: 0.40, shift: 10, sat: 0.7 }) // outer lips
shades("jkm", "#d65a78", { spread: 0.42, shift: 10 })            // inner pink / wet grip
pal({ p: "#ffc4cf", x: "#6e2238" })                              // wet glint, pussy line
shades("uv", "#b45a6c", { spread: 0.22, shift: 8 })              // asshole
// him
shades("ABCD", "#c8936f", { spread: 0.46, shift: 12, sat: 0.6 })
pal({ E: "#fbe8d4", O: "#5a3428" })
shades("WXYZ", "#4a3328", { spread: 0.30, shift: 10 })           // hair
shades("FGHI", "#a9655b", { spread: 0.46, shift: 10, sat: 0.8 }) // shaft + sack skin
pal({ J: "#f1c9bc", K: "#7c3f3a", V: "#4a2222" })                // sack glint, wrinkle, genital line
shades("PQRS", "#d9708a", { spread: 0.42, shift: 10 })           // glans
