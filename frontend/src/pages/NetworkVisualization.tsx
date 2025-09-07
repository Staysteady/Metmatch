import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api } from '../services/api';
import { Filter, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  firm: string;
  role: string;
  status: string;
  products: string[];
  markets: string[];
  activityLevel: number;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  established: string;
}

export default function NetworkVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    product: '',
    market: '',
    firm: ''
  });

  useEffect(() => {
    fetchNetworkData();
  }, []);

  useEffect(() => {
    if (data && svgRef.current) {
      renderNetwork();
    }
  }, [data, filters]);

  const fetchNetworkData = async () => {
    try {
      const response = await api.get('/network/network-data');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch network data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNetwork = () => {
    if (!svgRef.current || !data) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Filter nodes based on filters
    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];

    if (filters.role) {
      filteredNodes = filteredNodes.filter(n => n.role === filters.role);
    }
    if (filters.product) {
      filteredNodes = filteredNodes.filter(n => n.products.includes(filters.product));
    }
    if (filters.market) {
      filteredNodes = filteredNodes.filter(n => n.markets.includes(filters.market));
    }
    if (filters.firm) {
      filteredNodes = filteredNodes.filter(n => 
        n.firm.toLowerCase().includes(filters.firm.toLowerCase())
      );
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = filteredEdges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    const svg = d3.select(svgRef.current);
    
    // Add zoom behavior
    const g = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(filteredNodes as any)
      .force('link', d3.forceLink(filteredEdges)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => 
        Math.max(20, Math.min(50, d.activityLevel * 2))
      ));

    // Add edges
    const link = g.append('g')
      .selectAll('line')
      .data(filteredEdges)
      .enter().append('line')
      .attr('stroke', '#4B5563')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Add nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(filteredNodes)
      .enter().append('circle')
      .attr('r', (d: any) => Math.max(10, Math.min(30, d.activityLevel)))
      .attr('fill', (d: any) => {
        switch (d.role) {
          case 'TRADER_MM': return '#FCD34D';
          case 'BROKER': return '#60A5FA';
          case 'TRADER': return '#A78BFA';
          default: return '#9CA3AF';
        }
      })
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        setSelectedNode(d);
      })
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(filteredNodes)
      .enter().append('text')
      .text((d: any) => d.label)
      .attr('font-size', 10)
      .attr('fill', '#E5E7EB')
      .attr('text-anchor', 'middle')
      .attr('dy', -15);

    // Add status indicators
    const statusIndicator = g.append('g')
      .selectAll('circle')
      .data(filteredNodes)
      .enter().append('circle')
      .attr('r', 4)
      .attr('fill', (d: any) => {
        switch (d.status) {
          case 'ACTIVE': return '#10B981';
          case 'AWAY': return '#F59E0B';
          case 'BUSY': return '#EF4444';
          default: return '#6B7280';
        }
      })
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 1);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);

      statusIndicator
        .attr('cx', (d: any) => d.x + 15)
        .attr('cy', (d: any) => d.y - 15);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  const exportImage = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = svgRef.current.clientWidth;
    canvas.height = svgRef.current.clientHeight;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'network-visualization.png';
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Filters Panel */}
      <div className="w-80 bg-gray-800 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Network Filters
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="">All Roles</option>
              <option value="TRADER">Trader</option>
              <option value="TRADER_MM">Market Maker</option>
              <option value="BROKER">Broker</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Product</label>
            <input
              type="text"
              value={filters.product}
              onChange={(e) => setFilters({ ...filters, product: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="e.g., Aluminium"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Market</label>
            <input
              type="text"
              value={filters.market}
              onChange={(e) => setFilters({ ...filters, market: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="e.g., LME"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Firm</label>
            <input
              type="text"
              value={filters.firm}
              onChange={(e) => setFilters({ ...filters, firm: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Search by firm name"
            />
          </div>

          <button
            onClick={() => setFilters({ role: '', product: '', market: '', firm: '' })}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>

        {/* Legend */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
              <span className="text-sm text-gray-400">Trader</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-gray-400">Market Maker</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-gray-400">Broker</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white mb-3 mt-6">Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Away</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Busy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Offline</span>
            </div>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-8 p-4 bg-gray-700 rounded">
            <h3 className="text-sm font-semibold text-white mb-3">Selected User</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">{selectedNode.label}</p>
              <p className="text-gray-400">{selectedNode.firm}</p>
              <p className="text-gray-400">Role: {selectedNode.role}</p>
              <p className="text-gray-400">Activity: {selectedNode.activityLevel} trades</p>
              {selectedNode.products.length > 0 && (
                <div>
                  <p className="text-gray-400">Products:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.products.map(p => (
                      <span key={p} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Network Visualization */}
      <div className="flex-1 relative bg-gray-900">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            title="Reset View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={exportImage}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            title="Export Image"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: 'grab' }}
        />
      </div>
    </div>
  );
}