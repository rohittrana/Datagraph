import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { buildGraph, TYPE_COLORS } from '../lib/graphBuilder';
import './GraphView.css';

export default function GraphView() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, node: null });

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const init = async () => {
      await new Promise(r => setTimeout(r, 100));
      const { nodes: rawNodes, links: rawLinks } = buildGraph();
      const W = el.getBoundingClientRect().width || 900;
      const H = el.getBoundingClientRect().height || 600;

      const svg = d3.select(el);
      svg.selectAll('*').remove();

      const g = svg.append('g');

      const zoom = d3.zoom().scaleExtent([0.15, 3]).on('zoom', e => g.attr('transform', e.transform));
      svg.call(zoom);
      svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(0.5));

      // Arrow markers
      const defs = svg.append('defs');
      Object.entries(TYPE_COLORS).forEach(([type, color]) => {
        defs.append('marker')
          .attr('id', `arrow-${type}`)
          .attr('viewBox', '0 -4 8 8')
          .attr('refX', 20).attr('refY', 0)
          .attr('markerWidth', 5).attr('markerHeight', 5)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,-4L8,0L0,4')
          .attr('fill', color).attr('opacity', 0.5);
      });

      const nodes = rawNodes.map(n => ({ ...n }));
      const links = rawLinks.map(l => ({ ...l }));

      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(110).strength(0.4))
        .force('charge', d3.forceManyBody().strength(-260))
        .force('collide', d3.forceCollide(28))
        .force('center', d3.forceCenter(0, 0));

      simRef.current = sim;

      const linkEl = g.append('g').selectAll('line').data(links).enter().append('line')
        .attr('stroke', d => {
          const src = nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source));
          return src ? src.color + '55' : '#ffffff22';
        })
        .attr('stroke-width', 1)
        .attr('marker-end', d => {
          const src = nodes.find(n => n.id === (typeof d.source === 'object' ? d.source.id : d.source));
          return src ? `url(#arrow-${src.type})` : '';
        });

      const nodeEl = g.append('g').selectAll('g').data(nodes).enter().append('g')
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
        );

      nodeEl.append('circle')
        .attr('r', d => d.type === 'Customer' ? 16 : d.type === 'Product' ? 13 : 9)
        .attr('fill', d => d.color + '22')
        .attr('stroke', d => d.color)
        .attr('stroke-width', d => d.type === 'Customer' ? 2.5 : 1.5);

      nodeEl.append('text')
        .attr('text-anchor', 'middle').attr('dy', '0.35em')
        .attr('fill', d => d.color)
        .attr('font-size', d => d.type === 'Customer' ? 10 : 8)
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text(d => {
          if (d.type === 'Customer') return d.label.split(' ')[0];
          return d.id.replace('SO-', '').replace('DEL-', 'D').replace('INV-', 'I')
            .replace('PAY-', 'P').replace('JE-', 'J').replace('OI-', 'OI')
            .replace(/^C0|^P0|^A0/, s => s[0]);
        });

      nodeEl
        .on('mouseenter', (event, d) => {
          const rect = el.getBoundingClientRect();
          setTooltip({ visible: true, x: event.clientX - rect.left + 12, y: event.clientY - rect.top - 10, node: d });
        })
        .on('mouseleave', () => setTooltip(t => ({ ...t, visible: false })));

      sim.on('tick', () => {
        linkEl
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        nodeEl.attr('transform', d => `translate(${d.x},${d.y})`);
      });
    };

    init();
    return () => simRef.current?.stop();
  }, []);

  return (
    <div className="graph-panel">
      <svg ref={svgRef} className="graph-svg" />

      {/* Legend */}
      <div className="legend">
        <div className="legend-title">Node Types</div>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {type}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div className="node-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tooltip-type" style={{ color: tooltip.node.color }}>{tooltip.node.type}</div>
          <div className="tooltip-id">{tooltip.node.data.id}</div>
          {Object.entries(tooltip.node.data)
            .filter(([k]) => k !== 'id')
            .slice(0, 5)
            .map(([k, v]) => (
              <div key={k} className="tooltip-row">
                <span className="tooltip-key">{k}</span>
                <span className="tooltip-val">{String(v).slice(0, 22)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
