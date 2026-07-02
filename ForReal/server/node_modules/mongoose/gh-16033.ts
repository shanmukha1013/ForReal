import mongoose, { Schema, Model, PipelineStage } from 'mongoose';

// Simple Item schema
const itemSchema = new Schema({ text: String, published: Boolean });
const Item: Model<any> = mongoose.model('Item', itemSchema);

type UnionSubPipelineStage = Exclude<
  PipelineStage,
  PipelineStage.Out | PipelineStage.Merge
>;

function isUnionSubPipelineStage(stage: PipelineStage): stage is UnionSubPipelineStage {
  return !('$out' in stage) && !('$merge' in stage);
}

function toUnionSubPipeline(stages: PipelineStage[]): UnionSubPipelineStage[] {
  if (!stages.every(isUnionSubPipelineStage)) {
    throw new Error('unionWith pipeline cannot include $out or $merge');
  }
  return stages; // already narrowed, no `as`
}

// Create base pipeline using aggregate builder
const basePipeline = Item.aggregate([
  { $match: { published: true } },
  { $out: 'test' }
]);

// Try to reuse pipeline in unionWith - TypeScript error occurs here
const result = Item.aggregate()
  .match({ text: 'example' })
  .unionWith({
    coll: 'other_items',
    pipeline: toUnionSubPipeline(basePipeline.pipeline()) // ❌ TypeScript error
  });
