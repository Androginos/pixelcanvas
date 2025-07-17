'use client';

import React, { useState } from 'react';

export interface CanvasTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
  type: 'size' | 'svg';
  svgPath?: string;
  preview?: string;
}

const CANVAS_TEMPLATES: CanvasTemplate[] = [
  // Canvas size templates
  {
    id: 'square-1000',
    name: 'Square Canvas',
    width: 1000,
    height: 1000,
    description: '1000x1000 pixel square canvas - Perfect for pixel art',
    type: 'size'
  },
  {
    id: 'landscape-1200x800',
    name: 'Landscape Canvas',
    width: 1200,
    height: 800,
    description: '1200x800 pixel landscape canvas - Great for wide scenes',
    type: 'size'
  },
  {
    id: 'portrait-800x1200',
    name: 'Portrait Canvas',
    width: 800,
    height: 1200,
    description: '800x1200 pixel portrait canvas - Perfect for characters',
    type: 'size'
  },
  {
    id: 'wide-800x450',
    name: 'Wide Canvas',
    width: 800,
    height: 450,
    description: '800x450 pixel wide canvas - Ideal for landscapes',
    type: 'size'
  },
  {
    id: 'small-500x500',
    name: 'Small Canvas',
    width: 500,
    height: 500,
    description: '500x500 pixel small canvas - Fast and responsive',
    type: 'size'
  },
  {
    id: 'medium-750x750',
    name: 'Medium Canvas',
    width: 750,
    height: 750,
    description: '750x750 pixel medium canvas - Balanced performance',
    type: 'size'
  }
];

interface CanvasSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CanvasTemplate) => void;
}

export default function CanvasSelector({ isOpen, onClose, onSelectTemplate }: CanvasSelectorProps) {
  if (!isOpen) return null;

  const sizeTemplates = CANVAS_TEMPLATES.filter(t => t.type === 'size');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBFAF9] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#0E100F]">Choose Canvas Template</h2>
            <button
              onClick={onClose}
              className="text-[#0E100F] hover:text-[#836EF9] text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizeTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#836EF9] hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                {/* Preview */}
                <div className="mb-3">
                  <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📐</div>
                      <div className="text-sm font-mono text-[#0E100F]">
                        {template.width} × {template.height}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <h3 className="font-bold text-[#0E100F] mb-1">{template.name}</h3>
                <p className="text-sm text-[#0E100F] mb-2">{template.description}</p>
                <div className="text-xs text-[#836EF9] font-mono">
                  {template.width} × {template.height} pixels
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-[#0E100F] text-center">
              Select a template to start your collaborative pixel art project
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 