import mongoose, { Schema, Document } from 'mongoose';

export type EventType =
  | 'deployed'
  | 'restarted'
  | 'killed'
  | 'node_lost'
  | 'node_registered'
  | 'scale_up'
  | 'scale_down';

export interface IEvent extends Document {
  type: EventType;
  containerId: mongoose.Types.ObjectId | null;
  nodeId: mongoose.Types.ObjectId | null;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const EventSchema = new Schema<IEvent>({
  type: { type: String, required: true },
  containerId: { type: Schema.Types.ObjectId, ref: 'Container', default: null },
  nodeId: { type: Schema.Types.ObjectId, ref: 'Node', default: null },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);
