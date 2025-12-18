/**
 * Response Helper Functions
 * 
 * Standardized response helpers following RFC 9457 (Problem Details for HTTP APIs).
 * https://www.rfc-editor.org/rfc/rfc9457.html
 */

import { FastifyReply } from 'fastify';

/**
 * RFC 9457 Problem Details response structure
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  // Extension members
  errors?: any[];
  code?: string;
}

/**
 * Content-Type for RFC 9457 responses
 */
const PROBLEM_JSON = 'application/problem+json';

/**
 * Send a 400 Bad Request response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details for this occurrence
 * @param errors - Optional validation errors array
 * @returns Fastify reply
 */
export function sendBadRequest(
  reply: FastifyReply,
  detail: string,
  errors?: any[]
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    detail,
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return reply.status(400).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 401 Unauthorized response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details (default: 'Authentication required')
 * @returns Fastify reply
 */
export function sendUnauthorized(
  reply: FastifyReply,
  detail: string = 'Authentication required'
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Unauthorized',
    status: 401,
    detail,
  };
  
  return reply.status(401).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 403 Forbidden response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details (default: 'Access denied')
 * @param code - Optional application-specific error code
 * @returns Fastify reply
 */
export function sendForbidden(
  reply: FastifyReply,
  detail: string = 'Access denied',
  code?: string
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Forbidden',
    status: 403,
    detail,
  };
  
  if (code) {
    response.code = code;
  }
  
  return reply.status(403).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 404 Not Found response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details (default: 'Resource not found')
 * @returns Fastify reply
 */
export function sendNotFound(
  reply: FastifyReply,
  detail: string = 'Resource not found'
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Not Found',
    status: 404,
    detail,
  };
  
  return reply.status(404).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 409 Conflict response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details
 * @returns Fastify reply
 */
export function sendConflict(
  reply: FastifyReply,
  detail: string
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Conflict',
    status: 409,
    detail,
  };
  
  return reply.status(409).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 500 Internal Server Error response
 * 
 * @param reply - Fastify reply object
 * @param detail - Specific error details
 * @returns Fastify reply
 */
export function sendInternalError(
  reply: FastifyReply,
  detail: string
) {
  const response: ProblemDetails = {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail,
  };
  
  return reply.status(500).type(PROBLEM_JSON).send(response);
}

/**
 * Send a 201 Created response with data
 * 
 * @param reply - Fastify reply object
 * @param data - Response data
 * @returns Fastify reply
 */
export function sendCreated(
  reply: FastifyReply,
  data: any
) {
  return reply.status(201).send(data);
}

/**
 * Send a 204 No Content response
 * 
 * @param reply - Fastify reply object
 * @returns Fastify reply
 */
export function sendNoContent(reply: FastifyReply) {
  return reply.status(204).send();
}
