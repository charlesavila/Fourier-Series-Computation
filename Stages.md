# Stages to Build the Fourier Series Program

## Stage 1: Define the foundation

**Status: Complete**

- Confirm the browser-based technology and file structure.
- Define the neon-retro visual theme, page layout, and navigation between modes.
- Decide the numerical defaults, including equation samples, SVG samples, and maximum harmonic count.
- Define supported equation syntax and user-facing error messages.

## Stage 2: Build the equation input

**Status: Complete**

- Add inputs for the equation and its left and right bounds.
- Validate the bounds and equation syntax.
- Support variables, arithmetic operators, parentheses, constants, and common functions such as `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, and `abs`.
- Display clear errors for unsupported or invalid expressions.

## Stage 3: Implement Fourier-series calculations

- Treat the bounded equation as a periodic function.
- Numerically calculate `a0`, `an`, and `bn`.
- Store the calculated coefficients in a reusable data structure.
- Verify the calculations with simple known functions such as a constant, sine wave, and cosine wave.

## Stage 4: Display the equation results

- Plot the original bounded function.
- Plot the Fourier approximation beside or below the original graph.
- Add a slider that controls the highest harmonic `n`.
- Update the approximation and coefficient display when the slider changes.
- Show the calculated coefficient values in a readable table.

## Stage 5: Build the drawing-only complex-plane input

- Keep SVG upload out of the interface.
- Add a pointer-based drawing canvas for one or more line segments.
- Capture each pointer stroke as a separate ordered segment.
- Connect the end of each segment to the start of the next segment.
- Connect the final segment back to the start of the first segment.
- Center and scale the completed loop for the complex-plane canvas.
- Validate empty and insufficient drawings with useful errors.

## Stage 6: Implement the complex Fourier transform

- Convert sampled points into complex coordinates.
- Calculate DFT coefficients for the selected frequency range.
- Store each coefficient's frequency, amplitude, and phase.
- Sort coefficients by amplitude so the largest rotating vectors render first.
- Test the transform with simple geometric shapes and known periodic signals.

## Stage 7: Build the epicycle animation

- Add a complex-plane canvas.
- Draw circles and rotating vectors tip-to-tail.
- Animate the coefficient phases over normalized time.
- Draw the traced path behind the moving endpoint.
- Add controls for animation speed and number of rotating arrows.
- Add pause and resume behavior.

## Stage 8: Add freehand drawing

- Add a drawing canvas with a line tool.
- Capture pointer input as an ordered list of points.
- Connect the final point to the first point automatically.
- Clear and redraw the sketch when requested.
- Feed the closed drawing through the same sampling, DFT, and animation pipeline as imported SVGs.

## Stage 9: Integrate the interface

- Connect all controls to the calculation and rendering logic.
- Keep equation mode and complex-plane mode independent.
- Add loading, empty, and error states.
- Ensure the layout works on desktop and smaller screens.
- Apply the final neon-retro styling consistently.

## Stage 10: Validate and refine

- Run automated tests for equation parsing, Fourier coefficients, loop closure, SVG parsing, and DFT calculations.
- Validate the drawing-only complex-plane workflow with multiple line segments.
- Confirm that invalid equations, missing SVG paths, empty drawings, and invalid bounds fail clearly.
- Check animation performance with different arrow counts and sample sizes.
- Perform a final visual and usability review.