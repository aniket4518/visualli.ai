"use client"
import React from "react"
import { Home } from "lucide-react" 
import AiFlowchart from "@/components/a-iflowchart" // import component

export default function Flowchar() {
	interface FlowNode {
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

	// Initial node with children (positions will be recalculated)
	const initialNode: FlowNode = {
		id: "n1",
		label: "Root",
		level: 0,
		color: "#2563eb",
		zIndex: 100,
		x: 0,
		y: 0,
		children: [
			{
				id: "n2",
				label: "L1-A",
				level: 1,
				color: "#C41E3A",
				zIndex: 90,
				children: [
					{
						id: "n4",
						label: "L2-A1",
						level: 2,
						color: "#fbbf24",
						zIndex: 80,
						children: [
							{ id: "n10", label: "L3-A1a", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n11", label: "L3-A1b", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n12", label: "L3-A1c", level: 3, color: "#a3e635", zIndex: 70 }
						]
					},
					{
						id: "n5",
						label: "L2-A2",
						level: 2,
						color: "#fbbf24",
						zIndex: 80,
						children: [
							{ id: "n13", label: "L3-A2a", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n14", label: "L3-A2b", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n15", label: "L3-A2c", level: 3, color: "#a3e635", zIndex: 70 }
						]
					}
				]
			},
			{
				id: "n3",
				label: "L1-B",
				level: 1,
				color: "#C41E3A",
				zIndex: 90,
				children: [
					{
						id: "n6",
						label: "L2-B1",
						level: 2,
						color: "#fbbf24",
						zIndex: 80,
						children: [
							{ id: "n16", label: "L3-B1a", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n17", label: "L3-B1b", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n18", label: "L3-B1c", level: 3, color: "#a3e635", zIndex: 70 }
						]
					},
					{
						id: "n7",
						label: "L2-B2",
						level: 2,
						color: "#fbbf24",
						zIndex: 80,
						children: [
							{ id: "n19", label: "L3-B2a", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n20", label: "L3-B2b", level: 3, color: "#a3e635", zIndex: 70 },
							{ id: "n21", label: "L3-B2c", level: 3, color: "#a3e635", zIndex: 70 }
						]
					}
				]
			}
		]
	}

	// Add parentId to every node in the example tree for perfect tracking
	function addParentIds(node: any, parentId?: string): any {
		const newNode = { ...node, parentId }
		if (node.children) {
			newNode.children = node.children.map((child: any) => addParentIds(child, node.id))
		}
		return newNode
	}

	const treeWithParentIds = addParentIds(initialNode)

	return (
		<div className="w-full h-full">
			<AiFlowchart tree={treeWithParentIds} />
		</div>
	)
}