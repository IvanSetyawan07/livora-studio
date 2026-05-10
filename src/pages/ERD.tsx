import {
  ReactFlow,
  Background,
  Position,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const nodes = [
  {
    id: 'Users',
    position: { x: 100, y: -50 },
    targetPosition: Position.Right,
    sourcePosition: Position.Left,
    data: { 
        label: (<div>   
        <div> <b>Users</b></div>
        <div>-num_id</div>
        <div>-str_username</div>
        <div>-str_email</div>
        <div>-str_password</div>
        </div>) 
    },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },

  {
    id: 'loginPage',
    position: { x: 400, y: 100 },
    sourcePosition :Position.Left,
    data: { label: 'Login Page' },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },
  {
    id: 'admin',
    position: { x: 100, y: 150 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: { label: 
      (<div>
        <div><b>Admin</b></div>
        <div>-str_username</div>
        <div>-str_password</div>
      </div>)

    },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
    },
  },

    { id: 'crud',
    position: { x: -200, y: 100 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: { label: 
        (<div>
          <div><b>CRUD</b></div>
        </div>)
     },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },

  { id: 'project',
    position: { x: -500, y: -100 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: { label: 
        (<div>
          <div><b>Project</b></div>
          <div>-str_location</div>
          <div>-str_name-Project</div>
          <div>-str_katalog-project</div>
          <div>-str_description</div>
          <div>-str_location-point</div>
          <div>-num_year</div>
          <div>-str_scope</div>
        </div>)
     },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },
  { id: 'item-furniture',
    position: { x: -500, y: 150 },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: { label: 
        (<div>
          <div><b>Items</b></div>
          <div>-str_name-Item</div>
          <div>-str_texture</div>
          <div>-str_finish</div>
          <div>-num_weight</div>
          <div>-str_status-Avaliability</div>
          <div>-box-themes</div>
          <div>-box-categories</div>
        </div>)
     },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },
  { id: 'view-visitor',
    position: { x: -200, y: -100  },
    sourcePosition: Position.Left,
    targetPosition: Position.Right,
    data: { label: 
        (<div>
          <div><b>view-visitor</b></div>
          <div>-str_name-visitor</div>
          <div>-str_email</div>
          <div>-num_phone-number</div>
        </div>)
     },
    style: {
      background: '#111',
      color: 'white',
      border: '1px solid #333',
      width: 200,
      padding: 10,
    },
  },
];

const edges = [
  {
    id: 'e1',
    source: 'loginPage',
    target: 'Users',
    animated: true,
  },
  {
    id: 'e2',
    source: 'loginPage',
    target: 'admin',
    animated: true,
  },
  {
    id: 'e3',
    source: 'crud',
    target: 'project',
    animated: true,
  },
  {
    id: 'e4',
    source: 'crud',
    target: 'item-furniture',
    animated: true,
  },
  {
    id: 'e5',
    source: 'admin',
    target: 'crud',
    animated: true,
  },
  {
    id: 'e6',
    source: 'admin',
    target: 'view-visitor',
    animated: true,
  },
  {
    id: 'e7',
    source: 'Users',
    target: 'view-visitor',
    animated: true,
  },
];

export default function ERD() {
  return (
    <div className="w-screen h-screen bg-black">
      <ReactFlow nodes={nodes} edges={edges}>
        <Background color="#222" gap={20} />
      </ReactFlow>
    </div>
  );
}