// Token de inyección con el nombre del bucket y la URL de la cola.
export const AWS_CONFIG = Symbol('AWS_CONFIG');

export interface AwsConfig {
  bucketName: string;
  queueUrl: string;
}
