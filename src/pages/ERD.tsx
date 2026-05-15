import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { useCallback, useState, useEffect } from 'react';
// =========================
// NODE STYLES
// =========================

const authNode = {
  background: '#22c55e',
  border: '2px solid #86efac',
  color: 'white',
  borderRadius: 14,
  width: 260,
  padding: 12,
  boxShadow: '0px 0px 18px rgba(34,197,94,0.35)',
};

const adminNode = {
  background: '#f97316',
  border: '2px solid #fdba74',
  color: 'white',
  borderRadius: 14,
  width: 270,
  padding: 12,
  boxShadow: '0px 0px 18px rgba(249,115,22,0.35)',
};

const systemNode = {
  background: '#2563eb',
  border: '2px solid #60a5fa',
  color: 'white',
  borderRadius: 14,
  width: 270,
  padding: 12,
  boxShadow: '0px 0px 18px rgba(37,99,235,0.35)',
};

const masterNode = {
  background: '#374151',
  border: '2px solid #9ca3af',
  color: 'white',
  borderRadius: 14,
  width: 260,
  padding: 12,
  boxShadow: '0px 0px 18px rgba(156,163,175,0.25)',
};

// =========================
// NODES
// =========================

const initialNodes = [
  // =========================
  // AUTH
  // =========================

  {
    id: 'login',
    position: { x: 1200, y: -650 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Login System</b></div>
          <div>- Google Login</div>
          <div>- IOS Login</div>
          <div>- Email Login</div>
          <div>- Admin Login</div>
          <br />
          <div>Admin ID : Adminlivora</div>
          <div>Password : livorasukses</div>
        </div>
      ),
    },
    style: authNode,
  },

  {
    id: 'users',
    position: { x: 850, y: -650 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Users</b></div>
          <div>- user_id</div>
          <div>- username</div>
          <div>- email</div>
          <div>- password_hash</div>
          <div>- login_provider</div>
          <div>- last_login</div>
          <div>- profile_picture</div>
          <div>- saved_items</div>
          <div>- saved_projects</div>
        </div>
      ),
    },
    style: authNode,
  },

  {
    id: 'loginAnalytics',
    position: { x: 850, y: -420 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Login Analytics</b></div>
          <div>- total_login</div>
          <div>- active_users</div>
          <div>- login_time</div>
          <div>- user_device</div>
          <div>- user_location</div>
        </div>
      ),
    },
    style: authNode,
  },

  // =========================
  // ADMIN
  // =========================

  {
    id: 'adminDashboard',
    position: { x: 350, y: -500 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Admin Dashboard</b></div>
          <div>- CRUD Furniture</div>
          <div>- CRUD Projects</div>
          <div>- CRUD Category</div>
          <div>- CRUD Theme</div>
          <div>- Delete User</div>
          <div>- View Login Analytics</div>
          <div>- Manage Media</div>
        </div>
      ),
    },
    style: adminNode,
  },

  {
    id: 'projectManager',
    position: { x: 0, y: -700 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Project Manager</b></div>
          <div>- project_code</div>
          <div>- upload_project</div>
          <div>- edit_project</div>
          <div>- delete_project</div>
          <div>- assign_theme</div>
          <div>- assign_category</div>
        </div>
      ),
    },
    style: adminNode,
  },

  {
    id: 'furnitureManager',
    position: { x: 0, y: -350 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Furniture Manager</b></div>
          <div>- item_code</div>
          <div>- upload_item</div>
          <div>- edit_item</div>
          <div>- delete_item</div>
          <div>- assign_theme</div>
          <div>- assign_category</div>
        </div>
      ),
    },
    style: adminNode,
  },

  // =========================
  // PROJECT DOMAIN
  // =========================

  {
    id: 'projects',
    position: { x: -500, y: -700 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Projects</b></div>
          <div>- project_code</div>
          <div>- title</div>
          <div>- slug</div>
          <div>- category_id</div>
          <div>- theme_id</div>
          <div>- thumbnail</div>
          <div>- description</div>
          <div>- location</div>
          <div>- year</div>
        </div>
      ),
    },
    style: systemNode,
  },

  {
    id: 'projectMedia',
    position: { x: -900, y: -850 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Project Media</b></div>
          <div>- media_id</div>
          <div>- project_id</div>
          <div>- media_url</div>
          <div>- video_url</div>
          <div>- thumbnail</div>
        </div>
      ),
    },
    style: systemNode,
  },

  {
    id: 'projectRecommendation',
    position: { x: -900, y: -550 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Project Recommendation</b></div>
          <div>- related_project</div>
          <div>- same_theme</div>
          <div>- same_category</div>
          <div>- recommendation_score</div>
        </div>
      ),
    },
    style: systemNode,
  },

  // =========================
  // FURNITURE DOMAIN
  // =========================

  {
    id: 'furniture',
    position: { x: -500, y: -250 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Furniture</b></div>
          <div>- item_code</div>
          <div>- item_name</div>
          <div>- category_id</div>
          <div>- theme_id</div>
          <div>- material</div>
          <div>- texture</div>
          <div>- finish</div>
          <div>- stock_status</div>
        </div>
      ),
    },
    style: systemNode,
  },

  {
    id: 'furnitureRecommendation',
    position: { x: -900, y: -250 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Furniture Recommendation</b></div>
          <div>- same_theme</div>
          <div>- same_category</div>
          <div>- recommendation_score</div>
          <div>- trending_items</div>
        </div>
      ),
    },
    style: systemNode,
  },

  {
    id: 'furnitureMedia',
    position: { x: -900, y: 50 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Furniture Media</b></div>
          <div>- image_url</div>
          <div>- preview_image</div>
          <div>- 3d_model</div>
        </div>
      ),
    },
    style: systemNode,
  },

  // =========================
  // FILTER SYSTEM
  // =========================

  {
    id: 'themeFilter',
    position: { x: 350, y: 50 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Theme Filter System</b></div>
          <div>- Japandi</div>
          <div>- Industrial</div>
          <div>- Modern</div>
          <div>- Scandinavian</div>
          <div>- Minimalist</div>
        </div>
      ),
    },
    style: authNode,
  },

  {
    id: 'categoryFilter',
    position: { x: 350, y: 300 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Category Filter System</b></div>
          <div>- Chair</div>
          <div>- Table</div>
          <div>- Sofa</div>
          <div>- Bedroom</div>
          <div>- Office</div>
        </div>
      ),
    },
    style: authNode,
  },

  // =========================
  // MASTER DATA
  // =========================

  {
    id: 'themes',
    position: { x: -150, y: 100 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Themes</b></div>
          <div>- Japandi</div>
          <div>- Industrial</div>
          <div>- Modern Luxury</div>
          <div>- Scandinavian</div>
        </div>
      ),
    },
    style: masterNode,
  },

  {
    id: 'categories',
    position: { x: -150, y: 350 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Categories</b></div>
          <div>- Chair</div>
          <div>- Table</div>
          <div>- Sofa</div>
          <div>- Office</div>
          <div>- Residence</div>
        </div>
      ),
    },
    style: masterNode,
  },

  // =========================
  // USER ACTIVITY
  // =========================

  {
    id: 'savedCollection',
    position: { x: 850, y: 100 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Saved Collection</b></div>
          <div>- save_project</div>
          <div>- save_item</div>
          <div>- favorite_theme</div>
        </div>
      ),
    },
    style: authNode,
  },

  {
    id: 'recentView',
    position: { x: 850, y: 350 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: {
      label: (
        <div>
          <div><b>Recent View History</b></div>
          <div>- viewed_project</div>
          <div>- viewed_item</div>
          <div>- viewed_theme</div>
        </div>
      ),
    },
    style: authNode,
  },
];

// =========================
// EDGES
// =========================

const edgeStyle = {
  stroke: '#67e8f9',
  strokeWidth: 2,
};

const initialEdges = [
  {
    id: 'e1',
    source: 'login',
    target: 'users',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e2',
    source: 'users',
    target: 'loginAnalytics',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e3',
    source: 'adminDashboard',
    target: 'projectManager',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e4',
    source: 'adminDashboard',
    target: 'furnitureManager',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e5',
    source: 'projectManager',
    target: 'projects',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e6',
    source: 'projects',
    target: 'projectMedia',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e7',
    source: 'projects',
    target: 'projectRecommendation',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e8',
    source: 'furnitureManager',
    target: 'furniture',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e9',
    source: 'furniture',
    target: 'furnitureRecommendation',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e10',
    source: 'furniture',
    target: 'furnitureMedia',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e11',
    source: 'themeFilter',
    target: 'themes',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e12',
    source: 'themeFilter',
    target: 'projects',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e13',
    source: 'themeFilter',
    target: 'furniture',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e14',
    source: 'categoryFilter',
    target: 'categories',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e15',
    source: 'categoryFilter',
    target: 'projects',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e16',
    source: 'categoryFilter',
    target: 'furniture',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e17',
    source: 'users',
    target: 'savedCollection',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },

  {
    id: 'e18',
    source: 'users',
    target: 'recentView',
    animated: true,
    type: 'bezier',
    style: edgeStyle,
  },
];

// =========================
// COMPONENT
// =========================

export default function ERDArchitecture() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeColor, setNodeColor] =useState('#2563eb');
  const [selectedNode, setSelectedNode] =
  useState<any>(null);
  // =========================
// HISTORY UNTUK CTRL + Z
// =========================
 // =========================
  // ADD NODE
  // =========================

  const addNode = () => {

    const name = prompt('Nama kotak');

    if (!name) return;

    const newNode: any = {
      id: `node_${Date.now()}`,

      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      sourcePosition: Position.Left,
  targetPosition: Position.Right,

      data: {
        text: name,

        label: (
          <div>
            <b>{name}</b>
          </div>
        ),
      },

      style: {
        background: '#2563eb',
        color: 'white',
        padding: 12,
        borderRadius: 12,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };
  
const [history, setHistory] = useState([]);
const onNodesDelete = (deleted) => { saveHistory();

  const deletedIds = deleted.map((n) => n.id);

  setEdges((eds) =>
    eds.filter(
      (e) =>
        !deletedIds.includes(e.source) &&
        !deletedIds.includes(e.target)
    )
  );
};
const saveHistory = () => {
  setHistory((prev) => [
    ...prev,
    {
      nodes: [...nodes],
      edges: [...edges],
    },
  ]);
};
useEffect(() => {
  const handleUndo = (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();

      setHistory((prev) => {
        if (prev.length === 0) return prev;

        const last =
          prev[prev.length - 1];

        setNodes(last.nodes);
        setEdges(last.edges);

        return prev.slice(0, -1);
      });
    }
  };

  window.addEventListener(
    'keydown',
    handleUndo
  );

  return () =>
    window.removeEventListener(
      'keydown',
      handleUndo
    );
}, [setNodes, setEdges]);
// =========================
// DOUBLE CLICK EDIT NODE
// =========================

const onNodeDoubleClick = (
  event,
  node
) => {
  saveHistory();
  

  const newText = prompt(
    'Edit isi kotak:',
    node.data.text || ''
  );

  setNodes((nds) =>
    nds.map((n) => {
      if (n.id === node.id) {
        return {
          ...n,

          data: {
            ...n.data,

            text: newText || '',

            label: (
              <div>
                <div>
                  <b>
                    {newText || 'Kosong'}
                  </b>
                </div>
              </div>
            ),
          },
        };
      }

      return n;
    })
  );
};
const onConnect = useCallback(
  (params) => {

    saveHistory();

    const label = prompt(
      'Masukkan nama kabel / relasi'
    );

    const newEdge = {
      ...params,

      animated: true,

      type: 'bezier',

      label: label || '',

      style: {
        stroke: '#67e8f9',
        strokeWidth: 3,
      },

      labelStyle: {
        fill: 'white',
        fontWeight: 700,
      },

      labelBgStyle: {
        fill: '#0f172a',
        fillOpacity: 0.8,
      },
    };

    setEdges((eds) =>
      addEdge(newEdge, eds)
    );
  },
  [setEdges, saveHistory]
);

  return (
    
    <div className="w-screen h-screen bg-[#0b1020]">
     <button
  onClick={addNode}
  style={{
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1000,
    padding: '10px 20px',
    background: '#06b6d4',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  }}
>
  + Tambah Kotak
</button> 
<input
  type="color"
  value={nodeColor}
  onChange={(e) => {
    const color = e.target.value;

    setNodeColor(color);

    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,

            style: {
              ...n.style,

              background: color,
            },
          };
        }

        return n;
      })
    );
  }}
  style={{
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 1000,
    width: 60,
    height: 40,
    cursor: 'pointer',
  }}
/>
      <ReactFlow
      
  nodes={nodes}
  edges={edges}
  onNodeClick={(event, node) => {
  setSelectedNode(node);
}}
  onNodeDoubleClick={onNodeDoubleClick}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodesDelete={onNodesDelete}
  deleteKeyCode={['Backspace', 'Delete']}
  fitView

  minZoom={0.2}
  maxZoom={2}

  // =========================
  // NAVIGATION
  // =========================

  panOnDrag={true}
  panOnScroll={true}

  zoomOnScroll={true}
  zoomOnPinch={true}
  zoomOnDoubleClick={true}

  panActivationKeyCode="Space"

  // =========================
  // BETTER UX
  // =========================

  selectionOnDrag={false}

  nodesDraggable={true}
  nodesConnectable={true}
  elementsSelectable={true}

  // =========================
  // EDGE
  // =========================

  defaultEdgeOptions={{
    type: 'bezier',
    animated: true,
  }}
  
>

        <Controls />
      </ReactFlow>
    </div>
  );
}