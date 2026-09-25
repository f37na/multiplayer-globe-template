import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";

function App() {
	// A reference to the canvas element where we'll render the globe
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// The number of markers we're currently displaying
	const [counter, setCounter] = useState(0);
	// A map of marker IDs to their positions
	// Note that we use a ref because the globe's `onRender` callback
	// is called on every animation frame, and we don't want to re-render
	// the component on every frame.
	const positions = useRef<
		Map<
			string,
			{
				location: [number, number];
				size: number;
			}
		>
	>(new Map());
	// Connect to the PartyServer server
	const socket = usePartySocket({
		room: "default",
		party: "globe",
		onMessage(evt) {
			const message = JSON.parse(evt.data as string) as OutgoingMessage;
			if (message.type === "add-marker") {
				// Add the marker to our map
				positions.current.set(message.position.id, {
					location: [message.position.lat, message.position.lng],
					size: message.position.id === socket.id ? 0.1 : 0.05,
				});
				// Update the counter
				setCounter((c) => c + 1);
			} else {
				// Remove the marker from our map
				positions.current.delete(message.id);
				// Update the counter
				setCounter((c) => c - 1);
			}
		},
	});

	useEffect(() => {
		if (!canvasRef.current) return;

		// The angle of rotation of the globe
		// We'll update this on every frame to make the globe spin
		let phi = 0;
		let theta = 0;
		let isDragging = false;
		let lastPointerPosition = { x: 0, y: 0 };
		const canvas = canvasRef.current;

		const handlePointerDown = (event: PointerEvent) => {
			isDragging = true;
			lastPointerPosition = { x: event.clientX, y: event.clientY };
			canvas.setPointerCapture(event.pointerId);
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (!isDragging) return;

			const deltaX = event.clientX - lastPointerPosition.x;
			const deltaY = event.clientY - lastPointerPosition.y;
			phi += deltaX * 0.01;
			theta = Math.max(-0.8, Math.min(0.8, theta + deltaY * 0.01));
			lastPointerPosition = { x: event.clientX, y: event.clientY };
		};

		const handlePointerUp = (event: PointerEvent) => {
			isDragging = false;
			if (canvas.hasPointerCapture(event.pointerId)) {
				canvas.releasePointerCapture(event.pointerId);
			}
		};

		canvas.addEventListener("pointerdown", handlePointerDown);
		canvas.addEventListener("pointermove", handlePointerMove);
		canvas.addEventListener("pointerup", handlePointerUp);
		canvas.addEventListener("pointercancel", handlePointerUp);

		const globe = createGlobe(canvasRef.current, {
			devicePixelRatio: 2,
			width: 400 * 2,
			height: 400 * 2,
			phi: 0,
			theta: 0,
			dark: 0,
			diffuse: 0.8,
			mapSamples: 16000,
			mapBrightness: 1.5,
			baseColor: [0.85, 0.85, 0.85],
			markerColor: [0.192, 0.471, 0.776],
			glowColor: [0.75, 0.8, 0.9],
			markers: [],
			opacity: 0.7,
			onRender: (state) => {
				// Called on every animation frame.
				// `state` will be an empty object, return updated params.

				// Get the current positions from our map
				state.markers = [...positions.current.values()];

				// Rotate the globe
				state.phi = phi;
				state.theta = theta;
				if (!isDragging) phi += 0.005;
			},
		});

		return () => {
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointermove", handlePointerMove);
			canvas.removeEventListener("pointerup", handlePointerUp);
			canvas.removeEventListener("pointercancel", handlePointerUp);
			globe.destroy();
		};
	}, []);

	return (
		<div className="App">
			{/* The canvas where we'll render the globe */}
			<canvas
				ref={canvasRef}
				className="globe-canvas"
			/>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
