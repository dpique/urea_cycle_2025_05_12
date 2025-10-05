// js/cycleDisplay.js
import * as CONSTANTS from './constants.js';
import { getCurrentQuest } from './gameState.js';

// Urea Cycle nodes with positions in a circular layout
const cycleNodes = [
    // Mitochondrial part
    { id: 'nh3_co2', label: 'NH₃+CO₂', sublabel: '2 ATP', x: 125, y: 30, location: 'mito' },
    { id: 'carb_phos', label: 'Carb-P', sublabel: 'CPS1', x: 50, y: 60, location: 'mito' },
    { id: 'citrulline', label: 'CIT', sublabel: 'OTC', x: 30, y: 125, location: 'mito' },
    
    // Transport
    { id: 'transport', label: 'CIT', sublabel: 'ORNT1', x: 50, y: 190, location: 'transport' },
    
    // Cytosolic part
    { id: 'citrulline_cyto', label: 'CIT', sublabel: '+ASP+ATP', x: 125, y: 220, location: 'cyto' },
    { id: 'argininosuccinate', label: 'ARG-SUC', sublabel: 'ASS', x: 200, y: 190, location: 'cyto' },
    { id: 'arginine', label: 'ARG', sublabel: 'ASL', x: 220, y: 125, location: 'cyto' },
    { id: 'urea', label: 'UREA', sublabel: 'ARG1', x: 200, y: 60, location: 'cyto' },
    { id: 'ornithine', label: 'ORN', sublabel: '', x: 125, y: 90, location: 'cyto' },
    
    // Side reactions
    { id: 'fumarate', label: 'FUM', sublabel: '→MAL', x: 170, y: 140, location: 'cyto', side: true },
    { id: 'malate', label: 'MAL', sublabel: '→ASP', x: 170, y: 170, location: 'cyto', side: true }
];

// Connections between nodes
const cycleConnections = [
    { from: 'nh3_co2', to: 'carb_phos' },
    { from: 'carb_phos', to: 'citrulline' },
    { from: 'citrulline', to: 'transport' },
    { from: 'transport', to: 'citrulline_cyto' },
    { from: 'citrulline_cyto', to: 'argininosuccinate' },
    { from: 'argininosuccinate', to: 'arginine' },
    { from: 'arginine', to: 'urea' },
    { from: 'urea', to: 'ornithine' },
    { from: 'ornithine', to: 'carb_phos', dashed: true }, // Return path
    { from: 'arginine', to: 'fumarate', side: true },
    { from: 'fumarate', to: 'malate', side: true },
    { from: 'malate', to: 'citrulline_cyto', side: true, dashed: true }
];

// Map quest states to cycle nodes
const questStateToNode = {
    [CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP]: 'nh3_co2',
    [CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS]: 'carb_phos',
    [CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS]: 'carb_phos',
    [CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER]: 'citrulline',
    [CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE]: 'citrulline',
    [CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE]: 'transport',
    [CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL]: 'transport',
    [CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE]: 'citrulline_cyto',
    [CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP]: 'citrulline_cyto',
    [CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE]: 'citrulline_cyto',
    [CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY]: 'argininosuccinate',
    [CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN]: 'arginine',
    [CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS]: 'arginine',
    [CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE]: 'fumarate',
    [CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE]: 'malate',
    [CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE]: 'malate',
    [CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS]: 'urea',
    [CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA]: 'ornithine'
};

export function initCycleDisplay() {
    const svg = document.getElementById('cycleChart');
    const toggleButton = document.getElementById('cycleToggle');
    const diagram = document.getElementById('ureaCycleDiagram');
    
    if (!svg || !toggleButton || !diagram) return;
    
    // Toggle functionality
    toggleButton.addEventListener('click', () => {
        diagram.classList.toggle('collapsed');
    });
    
    // Create arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
        </marker>
        <marker id="arrowhead-completed" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4CAF50" />
        </marker>
    `;
    svg.appendChild(defs);
    
    // Create background regions
    const regions = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    regions.innerHTML = `
        <rect x="10" y="10" width="105" height="105" rx="5" 
              fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" stroke-width="1"/>
        <text x="62" y="25" class="cycle-sublabel" style="fill: #8B4513;">Mitochondria</text>
        
        <rect x="135" y="10" width="105" height="105" rx="5" 
              fill="rgba(0, 128, 0, 0.2)" stroke="rgba(0, 128, 0, 0.5)" stroke-width="1"/>
        <text x="187" y="25" class="cycle-sublabel" style="fill: #008000;">Cytosol</text>
        
        <rect x="10" y="175" width="230" height="10" rx="5" 
              fill="rgba(70, 130, 180, 0.3)" stroke="rgba(70, 130, 180, 0.6)" stroke-width="1"/>
    `;
    svg.appendChild(regions);
    
    // Draw connections first (so they appear under nodes)
    drawConnections();
    
    // Draw nodes
    drawNodes();
    
    // Initial update
    updateCycleDisplay();
}

function drawConnections() {
    const svg = document.getElementById('cycleChart');
    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    connectionsGroup.id = 'connections';
    
    cycleConnections.forEach((conn, index) => {
        const fromNode = cycleNodes.find(n => n.id === conn.from);
        const toNode = cycleNodes.find(n => n.id === conn.to);
        
        if (fromNode && toNode) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            // Calculate control points for curved paths
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const cx = fromNode.x + dx * 0.5;
            const cy = fromNode.y + dy * 0.5;
            
            // Special handling for return path (ornithine to carb_phos)
            if (conn.dashed) {
                path.setAttribute('stroke-dasharray', '5,5');
                // Make a wider curve for the return path
                const d = `M ${fromNode.x} ${fromNode.y} Q ${cx - 40} ${cy} ${toNode.x} ${toNode.y}`;
                path.setAttribute('d', d);
            } else if (conn.side) {
                // Side reactions get different curves
                const d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
                path.setAttribute('d', d);
            } else {
                // Normal connections
                const d = `M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`;
                path.setAttribute('d', d);
            }
            
            path.setAttribute('class', 'cycle-arrow');
            path.setAttribute('id', `conn-${index}`);
            path.setAttribute('marker-end', 'url(#arrowhead)');
            
            connectionsGroup.appendChild(path);
        }
    });
    
    svg.appendChild(connectionsGroup);
}

function drawNodes() {
    const svg = document.getElementById('cycleChart');
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.id = 'nodes';
    
    cycleNodes.forEach(node => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'cycle-node pending');
        g.setAttribute('id', `node-${node.id}`);
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        
        // Circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', node.side ? '12' : '15');
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '0');
        g.appendChild(circle);
        
        // Main label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'cycle-label');
        label.setAttribute('y', '3');
        label.textContent = node.label;
        g.appendChild(label);
        
        // Sublabel (enzyme/process)
        if (node.sublabel) {
            const sublabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            sublabel.setAttribute('class', 'cycle-sublabel');
            sublabel.setAttribute('y', node.side ? '20' : '25');
            sublabel.textContent = node.sublabel;
            g.appendChild(sublabel);
        }
        
        nodesGroup.appendChild(g);
    });
    
    svg.appendChild(nodesGroup);
}

export function updateCycleDisplay() {
    const quest = getCurrentQuest();
    if (!quest) return;
    
    const currentNodeId = questStateToNode[quest.state];
    
    // Update node states
    cycleNodes.forEach(node => {
        const nodeElement = document.getElementById(`node-${node.id}`);
        if (!nodeElement) return;
        
        // Determine if node is completed, current, or pending
        const nodeIndex = cycleNodes.findIndex(n => n.id === node.id);
        const currentIndex = cycleNodes.findIndex(n => n.id === currentNodeId);
        
        if (nodeIndex < currentIndex || quest.state === CONSTANTS.QUEST_STATE.COMPLETED) {
            nodeElement.setAttribute('class', 'cycle-node completed');
        } else if (node.id === currentNodeId) {
            nodeElement.setAttribute('class', 'cycle-node current');
        } else {
            nodeElement.setAttribute('class', 'cycle-node pending');
        }
    });
    
    // Update connection states
    cycleConnections.forEach((conn, index) => {
        const connElement = document.getElementById(`conn-${index}`);
        if (!connElement) return;
        
        const fromIndex = cycleNodes.findIndex(n => n.id === conn.from);
        const toIndex = cycleNodes.findIndex(n => n.id === conn.to);
        const currentIndex = cycleNodes.findIndex(n => n.id === currentNodeId);
        
        if (toIndex <= currentIndex || quest.state === CONSTANTS.QUEST_STATE.COMPLETED) {
            connElement.setAttribute('class', 'cycle-arrow completed');
            connElement.setAttribute('marker-end', 'url(#arrowhead-completed)');
        } else {
            connElement.setAttribute('class', 'cycle-arrow');
            connElement.setAttribute('marker-end', 'url(#arrowhead)');
        }
    });
}