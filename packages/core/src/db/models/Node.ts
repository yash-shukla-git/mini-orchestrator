import mongoose, { Schema, Document } from 'mongoose';

export interface INode extends Document {
  port: number;
  host: string;
  status: 'active' | 'lost';
  lastHeartbeat: Date;
  memoryMB: number;
  registeredAt: Date;
}

const NodeSchema = new Schema<INode>({
  port: { type: Number, required: true },
  host: { type: String, required: true },
  status: { type: String, enum: ['active', 'lost'], default: 'active' },
  lastHeartbeat: { type: Date, default: Date.now },
  memoryMB: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },
});

export const Node = mongoose.model<INode>('Node', NodeSchema);
