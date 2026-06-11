export const toJSONPlugin = (schema: any) => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
};
