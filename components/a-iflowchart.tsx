"use client"
import React, { useRef, useEffect, useState } from "react"

type FlowNode = {
	id: string
	label: string
	level: number
	parentId?: string
	color: string
	zIndex: number
	children?: FlowNode[]
	x?: number
	y?: number
}

const HomeIcon = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="currentColor"
		xmlns="http://www.w3.org/2000/svg"
		className={className}
	>
		<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
	</svg>
)

export default function AiFlowchart({ tree }: { tree: FlowNode }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const [nodes, setNodes] = useState<FlowNode[]>([])
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [currentNode, setCurrentNode] = useState<FlowNode>(tree)
	const [animating, setAnimating] = useState(false)
	const [fade, setFade] = useState(1)
	const [scale, setScale] = useState(1)
	const [childrenScale, setChildrenScale] = useState(0)
	const [childrenFade, setChildrenFade] = useState(0)
	const [showChildren, setShowChildren] = useState(false)
	const [zoomLevel, setZoomLevel] = useState<number>(0) // NEW: track zoom level (0 = only root layer visible). Each level visually doubles scale.

	// NEW: track which visible node is focused (for choosing which branch to drill)
	const [focusedIndex, setFocusedIndex] = useState<number>(0)
	const focusedId = nodes[focusedIndex]?.id ?? null

	// Find node by id within passed tree
	function findNodeById(node: FlowNode | null, id: string): FlowNode | null {
		if (!node) return null
		if (node.id === id) return node
		if (node.children) {
			for (const c of node.children) {
				const found = findNodeById(c, id)
				if (found) return found
			}
		}
		return null
	}

	// Path root -> id
	function getNodePath(node: FlowNode, id: string, path: FlowNode[] = []): FlowNode[] {
		if (!node) return []
		if (node.id === id) return [...path, node]
		if (node.children) {
			for (const c of node.children) {
				const found = getNodePath(c, id, [...path, node])
				if (found.length) return found
			}
		}
		return []
	}

	// Background color selection 
	function getCanvasBg(): string {
		if (!selectedId) {
			if (!currentNode || currentNode.id === tree.id) return "#000"
			return currentNode.color
		}
		const node = findNodeById(tree, selectedId)
		return node ? node.color : "#000"
	}

	// Compute nodes to show
	function getNodesToShow(): FlowNode[] {
		const canvas = canvasRef.current
		if (!canvas) return []
		const width = (canvas.width = canvas.offsetWidth)
		const height = (canvas.height = canvas.offsetHeight)
		const centerX = width / 2
		const centerY = height / 2

		// root view
		if (!selectedId && (!currentNode || currentNode.id === tree.id)) {
			return [{ ...tree, x: centerX, y: centerY }]
		}

		const nodeToCheck = selectedId ? findNodeById(tree, selectedId) : currentNode
		if (!nodeToCheck) return [{ ...tree, x: centerX, y: centerY }]

		// If node has children -> show them
		if (nodeToCheck.children && nodeToCheck.children.length > 0) {
			const count = nodeToCheck.children.length
			// RESPONSIVE spacing: spread across canvas but keep a reasonable min gap
			const maxSpacing = 300
			const minSpacing = 120
			const available = Math.max(width - 200, 400)
			const spacing = Math.max(minSpacing, Math.min(maxSpacing, available / Math.max(1, count)))
			return nodeToCheck.children.map((c, i) => ({
				...c,
				x: centerX + (i - (count - 1) / 2) * spacing,
				y: centerY
			}))
		}

		// Otherwise show parent's children (siblings), 
		const path = getNodePath(tree, nodeToCheck.id)
		if (path.length >= 2) {
			const parent = path[path.length - 2]
			if (parent.children && parent.children.length > 0) {
				const count = parent.children.length
				const maxSpacing = 300
				const minSpacing = 120
				const available = Math.max(width - 200, 400)
				const spacing = Math.max(minSpacing, Math.min(maxSpacing, available / Math.max(1, count)))
				return parent.children.map((c, i) => ({
					...c,
					x: centerX + (i - (count - 1) / 2) * spacing,
					y: centerY
				}))
			}
		}

		// Fallback to root
		return [{ ...tree, x: centerX, y: centerY }]
	}

	// Draw single node (highlight if focused / selected)
	function drawNode(ctx: CanvasRenderingContext2D, node: FlowNode, nodeScale = 1, nodeFade = 1) {
		const radius = 60 * nodeScale
		ctx.save()
		ctx.globalAlpha = nodeFade
		ctx.beginPath()
		ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
		ctx.fillStyle = selectedId === node.id ? "#60a5fa" : node.color
		ctx.shadowColor = "#333"
		ctx.shadowBlur = 8
		ctx.fill()

		// Only the selected node shows a white outer border.
		// Focused node (focusedId) no longer receives a white border to avoid always-highlighting the first node.
		if (selectedId === node.id) {
			// outer white ring
			ctx.beginPath()
			ctx.arc(node.x!, node.y!, radius + 6, 0, 2 * Math.PI)
			ctx.lineWidth = 6
			ctx.strokeStyle = "#fff"
			ctx.stroke()

			// inner separator stroke
			ctx.beginPath()
			ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
			ctx.lineWidth = 3
			ctx.strokeStyle = "#222"
			ctx.stroke()
		} else {
			// default border for non-selected nodes
			ctx.beginPath()
			ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
			ctx.lineWidth = 3
			ctx.strokeStyle = "#222"
			ctx.stroke()
		}

		ctx.globalAlpha = 1
		ctx.fillStyle = "#fff"
		ctx.font = `bold ${20 * nodeScale}px sans-serif`
		ctx.textAlign = "center"
		ctx.textBaseline = "middle"
		ctx.fillText(node.label, node.x!, node.y!)
		ctx.restore()
	}

	// Update visible nodes when selection/current changes
	useEffect(() => {
		const next = getNodesToShow()
		setNodes(next)
		// reset focused index when visible nodes change
		setFocusedIndex(0)
	}, [canvasRef.current, currentNode, selectedId, tree])

	// Resize canvas backing store
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const setSize = () => {
			canvas.width = canvas.offsetWidth
			canvas.height = canvas.offsetHeight
			setNodes(getNodesToShow())
		}
		setSize()
		window.addEventListener("resize", setSize)
		return () => window.removeEventListener("resize", setSize)
	}, [tree])

	// Simple animation control (kept)
	useEffect(() => {
		if (!animating) return
		let frame = 0
		const total = 60
		setChildrenScale(0)
		setChildrenFade(0)
		const animate = () => {
			frame++
			setScale(1 + 0.7 * (frame / total))
			setFade(1 - frame / total)
			setChildrenScale(frame / total)
			setChildrenFade(frame / total)
			if (frame < total) requestAnimationFrame(animate)
			else {
				setShowChildren(true)
				setAnimating(false)
				setScale(1)
				setFade(1)
				setChildrenScale(1)
				setChildrenFade(1)
			}
		}
		animate()
	}, [animating])

	// Draw loop — apply global visual zoom based on zoomLevel, but only when zoomLevel
	// exceeds the baseline for the currently reached layer (so nodes start at scale 1 when reached).
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		// Determine base level for the current view:
		// - if a node is selected (we're viewing its children) use that node's level
		// - otherwise use currentNode.level
		const selectedNode = selectedId ? findNodeById(tree, selectedId) : null
		const baseLevel = selectedNode ? selectedNode.level : currentNode?.level ?? 0

		// multiplier applies only when zoomLevel goes beyond (baseLevel + 1).
		const computeMultiplier = () => Math.pow(2, Math.max(0, zoomLevel - (baseLevel + 1)))

		// When selectedId (forward animation) we draw selected node centered + animating children
		if (selectedId && !showChildren) {
			const width = canvas.width
			const height = canvas.height
			const centerX = width / 2
			const centerY = height / 2
			const node = findNodeById(tree, selectedId)
			if (node) {
				const multiplier = computeMultiplier()
				// selected node should appear at scale 1 when reached; animation 'scale' still used for the forward animation,
			 drawNode(ctx, { ...node, x: centerX, y: centerY }, scale * multiplier, fade)
				const childrenArr = node.children ?? []
				const count = childrenArr.length
				// spacing remains responsive/consistent with other code
				const spacing = 200
				childrenArr.forEach((child, idx) => {
					const targetX = centerX + (idx - (count - 1) / 2) * spacing
					const targetY = centerY
					const animX = centerX + (targetX - centerX) * childrenScale
					const animY = centerY + (targetY - centerY) * childrenScale
					// children's animation scale combined with multiplier (multiplier will be 1 unless zoomLevel > baseline)
					drawNode(ctx, { ...child, x: animX, y: animY }, childrenScale * multiplier, childrenFade)
				})
			}
			return
		}

	 
		// compute multiplier once it will be 1 when zoomLevel base baseline 
		const multiplier = computeMultiplier()
		nodes.forEach(n => drawNode(ctx, n, 1 * multiplier, 1))
	}, [nodes, selectedId, animating, fade, scale, childrenScale, childrenFade, zoomLevel, currentNode, tree])

	// goHome handler  
	function goHome() {
		setCurrentNode(tree)
		setSelectedId(null)
		setShowChildren(false)
		setAnimating(false)
		setZoomLevel(0)
	}

	//   selection controls for visible nodes  
	function prevVisible() {
		if (nodes.length <= 1) return
		setFocusedIndex(i => Math.max(0, i - 1))
	}
	function nextVisible() {
		if (nodes.length <= 1) return
		setFocusedIndex(i => Math.min(nodes.length - 1, i + 1))
	}

	// NEW: zoom in/out handlers that use focused node when drilling
	function zoomIn() {
		const z = zoomLevel
		const focus = currentNode ?? tree

		// if at root level -> show root's children (no drilling yet)
		if (z === 0) {
			if (focus.children && focus.children.length > 0) {
				// reveal layer1 (animation from root)
				setSelectedId(focus.id)
				setAnimating(true)
				setZoomLevel(1)
			}
			return
		}

		// deeper zoom: pick the focused visible node to drill into
		const visible = nodes
		const nodeToDrill = visible[focusedIndex] ?? visible[0]
		if (nodeToDrill && nodeToDrill.children && nodeToDrill.children.length > 0) {
			setSelectedId(nodeToDrill.id)
			setCurrentNode(nodeToDrill)
			setAnimating(true)
			setShowChildren(false)
			setZoomLevel(z + 1)
		}
	}

	function zoomOut() {
		const z = zoomLevel
		if (z <= 0) return
		if (z === 1) {
			setCurrentNode(tree)
			setSelectedId(null)
			setShowChildren(false)
			setAnimating(false)
			setZoomLevel(0)
			setNodes(getNodesToShow())
			return
		}
		const path = getNodePath(tree, currentNode.id)
		if (path.length >= 2) {
			const parent = path[path.length - 2]
			// Keep the parent selected and show its children so we stay on that layer
			setCurrentNode(parent)
			setSelectedId(parent.id)
			setShowChildren(true)
			setAnimating(false)
			setZoomLevel(z - 1)
			setNodes(getNodesToShow())
		} else {
			setCurrentNode(tree)
			setSelectedId(null)
			setShowChildren(false)
			setAnimating(false)
			setZoomLevel(0)
			setNodes(getNodesToShow())
		}
	}

	return (
		<div className="fixed inset-0 w-screen h-screen relative" style={{ background: getCanvasBg() }}>
			 
			<button
				type="button"
				onClick={goHome}
				title="Home"
				aria-label="Go to root"
				className="fixed top-5 left-2 h-20 w-20 z-50 flex items-center justify-center rounded-full cursor-pointer "
			>
				<HomeIcon size={28} className="text-white" />
			</button>
 
			<div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
			 
				<div className="flex gap-2 mb-1">
					<button
						type="button"
						onClick={prevVisible}
						disabled={nodes.length <= 1 || focusedIndex === 0}
						className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-40"
						aria-label="Previous visible"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
					</button>
					<span className="text-white flex items-center px-2">{nodes.length > 0 ? `${focusedIndex + 1} / ${nodes.length}` : ""}</span>
					<button
						type="button"
						onClick={nextVisible}
						disabled={nodes.length <= 1 || focusedIndex === nodes.length - 1}
						className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-40"
						aria-label="Next visible"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
					</button>
				</div>

				<div className="flex flex-col gap-2">
					<button
						type="button"
						onClick={zoomIn}
						title="Zoom in"
						aria-label="Zoom in"
						className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
					>
				 
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
					<button
						type="button"
						onClick={zoomOut}
						title="Zoom out"
						aria-label="Zoom out"
						className={`h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ${zoomLevel === 0 ? "opacity-50 pointer-events-none" : ""}`}
					>
						{/* minus icon */}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</div>
			</div>

			<canvas
				ref={canvasRef}
				className="w-full h-full cursor-default"
				style={{ position: "absolute", top: 0, left: 0 }}
			/>
		</div>
	)
}
