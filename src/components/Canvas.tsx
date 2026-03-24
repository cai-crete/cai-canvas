// [V172 PHASE 2 - UNLINKED] React Flow Canvas Component
import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  applyNodeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../store/useCanvasStore';
import ImageNode from './ImageNode';

// Define custom node types
const nodeTypes = {
  imageNode: ImageNode,
};

interface CanvasProps {
  isGenerating: boolean;
  openLibraryItemId: string | null;
  setOpenLibraryItemId: (id: string | null) => void;
  artboardPage: number;
  setArtboardPage: (page: number) => void;
}

export default function Canvas({ 
  isGenerating, 
  openLibraryItemId, 
  setOpenLibraryItemId, 
  artboardPage, 
  setArtboardPage 
}: CanvasProps) {
  const { 
    canvasItems, 
    updateCanvasItem, 
    setSelectedItemId, 
    selectedItemId,
    removeCanvasItem,
    saveHistoryState
  } = useCanvasStore();

  // Map CanvasItems to React Flow Nodes
  const nodes = useMemo(() => {
    return canvasItems.map((item) => ({
      id: item.id,
      type: 'imageNode',
      position: { x: item.x, y: item.y },
      data: { 
        item,
        isGenerating,
        openLibraryItemId,
        setOpenLibraryItemId,
        artboardPage,
        setArtboardPage,
        removeCanvasItem,
        setSelectedItemId,
        saveHistoryState,
        // We'll pass the current zoom level via a custom hook or panel later if needed, 
        // but for now, we'll use React Flow's internal state.
        zoomLevel: 1 
      },
      selected: selectedItemId === item.id,
    }));
  }, [canvasItems, isGenerating, openLibraryItemId, artboardPage, selectedItemId]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateCanvasItem(change.id, { 
            x: change.position.x, 
            y: change.position.y 
          });
        }
        if (change.type === 'select') {
          if (change.selected) {
            setSelectedItemId(change.id);
          } else if (selectedItemId === change.id) {
            setSelectedItemId(null);
          }
        }
      });
    },
    [updateCanvasItem, setSelectedItemId, selectedItemId]
  );

  return (
    <div className="w-full h-full relative outline-none border-none">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        // V171: Performance Optimization - Only render visible nodes
        onlyRenderVisibleElements={true}
        // V171: Stylistic integration with our Grid
        colorMode="inherit"
      >
        <Background 
          variant={'lines' as any} 
          gap={12} 
          size={1} 
          color="rgba(128,128,128,0.1)" 
        />
        <Background 
          variant={'lines' as any} 
          gap={60} 
          size={1} 
          color="rgba(128,128,128,0.2)" 
          id="major-grid"
        />
        
        {/* React Flow Controls (Optional, we have our own, but good to have) */}
        <Panel position="bottom-left">
           {/* Custom control overrides could go here */}
        </Panel>
      </ReactFlow>
    </div>
  );
}
