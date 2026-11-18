# Fourier series plotter

## Purpose
This app will have two functions.
accept an equation like y=2x^3 +4 and develope the fourier series for it, output the fourier series and have a graph with an ajustable slider to determine to what n the series goes to.

The second function will plot a graph in the complex plane using an imput svg file. 

## Inputs
For Equation input - a given y = equation, with bounds on left and right.

for the svg file - svg upload, the animation speed, and the number of rotating arrows
I want another option that will have a box where you draw something with a line tool, and the code uses that to develope the fourier animation for that. of course the line would have to be a loop so it could work, so it automatically connects the endpoints


## Calculations
The equations, rules, or logic the app uses, written out. Define every variable and its units.

for the equation input - solves for a0, an, and bn, displays them 

for the svg file - Goal: Parse an uploaded SVG path, compute its Discrete Fourier Transform (DFT) coefficients in the complex plane, and animate the resulting rotating epicycles (circles/vectors) tip-to-tail to trace the shape.1. SVG Parsing & Path SamplingExtract the primary <path> element from the uploaded SVG.Use the browser's native SVG DOM methods (path.getTotalLength() and path.getPointAtLength()) to sample $M$ evenly spaced points along the path (e.g., $M = 1000$).Center the points around the canvas origin $(0,0)$ by subtracting the bounding-box center, and map each 2D coordinate $(x, y)$ to a complex number $z_k = x_k + i y_k$ for $k = 0 \dots M-1$.2. Compute Fourier Coefficients (DFT)Choose a frequency range $n \in [-N, N]$ (e.g., $N = 50$ for 101 total circles).For each integer frequency $n$, compute its complex coefficient $c_n$ using numerical integration:$$c_n = \frac{1}{M} \sum_{k=0}^{M-1} z_k \cdot e^{-i \cdot 2\pi n \frac{k}{M}}$$(In code: $e^{-i\theta} = \cos(\theta) - i\sin(\theta)$).Store each coefficient with its frequency $n$, amplitude/radius $r_n = \vert{}c_n\vert{}$, and initial phase angle $\phi_n = \text{atan2}(\text{Im}(c_n), \text{Re}(c_n))$.Sort the list of coefficients in descending order by amplitude ($r_n$) so the largest circles render first and the smallest details render at the tip.3. Animation Loop (Canvas / WebGL)Track normalized time $t \in [0, 1)$, incrementing $t$ by $\Delta t = \frac{1}{M}$ each frame.Starting at origin $(x, y) = (0, 0)$, iterate through the sorted coefficients:Calculate the current angle: $\theta = 2\pi n t + \phi_n$.Calculate the vector endpoint:$$x_{\text{next}} = x + r_n \cos(\theta)$$$$y_{\text{next}} = y + r_n \sin(\theta)$$Draw a circle centered at $(x, y)$ with radius $r_n$, and a line from $(x, y)$ to $(x_{\text{next}}, y_{\text{next}})$.Update $(x, y) \leftarrow (x_{\text{next}}, y_{\text{next}})$.Push the final tip coordinate to a trail array and render the traced path behind the moving tip.
## Outputs
for the equation input - displays a graph of the original equation, on another graph it displays the fourier series with a slider for what value n the series uses

for the svg input - It will create a plot on the complex plane that will have an animation of the fourier circles going in a loop to create the svg file line, or the line drawn by the user. 

## Look and feel
I want the app to have a neon retro look

## Validation
Test using the Quake.svg file if it can successfully generate the animation for the fourier series

## Out of scope
