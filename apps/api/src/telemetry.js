/**
 * OpenTelemetry setup — must be imported BEFORE any other application module
 * so auto-instrumentation can patch http, express, pg, etc. at load time.
 *
 * Traces are exported via OTLP/HTTP to whatever collector is configured in
 * OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318).
 * Set OTEL_TRACES_EXPORTER=none to disable in test environments.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// In OTel SDK v2, the SEMRESATTRS_* constants are deprecated.
// Use the well-known string attribute keys directly.
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'plated-api';
const serviceVersion = process.env.npm_package_version ?? '0.0.0';

const resource = new Resource({
  'service.name': serviceName,
  'service.version': serviceVersion,
  'deployment.environment': process.env.NODE_ENV ?? 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation — too noisy in development
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Annotate HTTP spans with the request method
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, req) => {
          span.setAttribute('http.request.method', req.method ?? '');
        },
      },
    }),
  ],
});

sdk.start();

// Flush pending spans before the process exits
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[otel] SDK shut down successfully'))
    .catch((err) => console.error('[otel] SDK shutdown error', err))
    .finally(() => process.exit(0));
});

export default sdk;
