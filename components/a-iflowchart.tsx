"use client"
import React, { useRef, useEffect, useState } from "react"
import { Home } from "lucide-react" 

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
 
		if (!selectedId && (!currentNode || currentNode.id === tree.id)) {
			return [{ ...tree, x: centerX, y: centerY }]
		}

		const nodeToCheck = selectedId ? findNodeById(tree, selectedId) : currentNode
		if (!nodeToCheck) return [{ ...tree, x: centerX, y: centerY }]
 
		if (nodeToCheck.children && nodeToCheck.children.length > 0) {
			const count = nodeToCheck.children.length
			const spacing = 200
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
				const spacing = 200
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

	// Draw single node
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
		ctx.lineWidth = 3
		ctx.strokeStyle = "#222"
		ctx.stroke()
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
		setNodes(getNodesToShow())
	 
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
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		 
		if (selectedId && !showChildren) {
			const width = canvas.width
			const height = canvas.height
			const centerX = width / 2
			const centerY = height / 2
			const node = findNodeById(tree, selectedId)
			if (node) {
				drawNode(ctx, { ...node, x: centerX, y: centerY }, scale, fade)
				const childrenArr = node.children ?? []
				const count = childrenArr.length
				const spacing = 200
				childrenArr.forEach((child, idx) => {
					const targetX = centerX + (idx - (count - 1) / 2) * spacing
					const targetY = centerY
					const animX = centerX + (targetX - centerX) * childrenScale
					const animY = centerY + (targetY - centerY) * childrenScale
					drawNode(ctx, { ...child, x: animX, y: animY }, childrenScale, childrenFade)
				})
			}
			return
		}
 
		nodes.forEach(n => drawNode(ctx, n, 1, 1))  
	}, [nodes, selectedId, animating, fade, scale, childrenScale, childrenFade])

	 //this is handelonclick
	function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current
		if (!canvas) return
		const rect = canvas.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const visible = nodes.map(n => ({ node: n, x: n.x!, y: n.y!, scale: 1 }))
		let hit: FlowNode | null = null
		for (const v of visible) {
			if (Math.hypot(x - v.x, y - v.y) <= 60 * v.scale) {
				hit = v.node
				break
			}
		}
		if (hit) {
			if (!hit.children || hit.children.length === 0) return
			// forward
			setSelectedId(hit.id)
			setCurrentNode(hit)
			setAnimating(true)
			setShowChildren(false)
			return
		}

		// backward: if a node was selected (forward anim target)
		if (selectedId) {
			// If children are already shown, treat click as "close children" — go one level up to the selected node
			if (showChildren) {
				setSelectedId(null)
				setShowChildren(false)
				setAnimating(false)
				// refresh visible nodes immediately
				setNodes(getNodesToShow())
				return
			}
			// If children are not yet shown (during forward animation), move up to parent of the selected node
			const path = getNodePath(tree, selectedId)
			if (path.length >= 2) {
				const parent = path[path.length - 2]
				setCurrentNode(parent)
				setSelectedId(null)
				setShowChildren(false)
				setAnimating(false)
				return
			}
		}
		// if no selection, but currentNode has parent, move up
		if (currentNode && currentNode.parentId) {
			const path = getNodePath(tree, currentNode.id)
			if (path.length >= 2) {
				const parent = path[path.length - 2]
				setCurrentNode(parent)
				setSelectedId(null)
				setShowChildren(false)
				setAnimating(false)
				return
			}
		}
		// otherwise reset to root
		setCurrentNode(tree)
		setSelectedId(null)
		setShowChildren(false)
		setAnimating(false)
	}

	// Add goHome handler  
	function goHome() {
		setCurrentNode(tree)
		setSelectedId(null)
		setShowChildren(false)
		setAnimating(false)
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
				<Home size={28} className="text-white" />
			</button>

			<canvas
				ref={canvasRef}
				className="w-full h-full cursor-pointer"
				style={{ position: "absolute", top: 0, left: 0 }}
				onClick={handleCanvasClick}
			/>
		</div>
	)
}
