import mongoose, { Schema, Document } from 'mongoose';

export interface IContainer extends Document {
  dockerId: string;
  name: string;
  image: string;
  groupName: string;
  replicaIndex: number;
  nodeId: mongoose.Types.ObjectId;
  status: 'pending' | 'running' | 'stopped' | 'restarting' | 'dead';
  restartCount: number;
  createdAt: Date;
  stoppedAt: Date | null;
}

const ContainerSchema = new Schema<IContainer>({
  dockerId: { type: String, default: '' },
  name: { type: String, required: true },
  image: { type: String, required: true },
  groupName: { type: String, required: true },
  replicaIndex: { type: Number, required: true },
  nodeId: { type: Schema.Types.ObjectId, ref: 'Node', required: true },
  status: { type: String, enum: ['pending', 'running', 'stopped', 'restarting', 'dead'], default: 'pending' },
  restartCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  stoppedAt: { type: Date, default: null },
});

export const Container = mongoose.model<IContainer>('Container', ContainerSchema);
