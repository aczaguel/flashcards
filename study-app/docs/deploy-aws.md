# Despliegue en AWS S3 + CloudFront

Guía para desplegar Study App como sitio web estático con HTTPS.

## Arquitectura

```
Route 53 (dominio)
      │
      ▼
CloudFront (CDN + HTTPS)
      │
      ▼
S3 Bucket (archivos estáticos)
```

---

## Prerrequisitos

- Cuenta de AWS con permisos en S3, CloudFront, ACM y Route 53
- AWS CLI instalado y configurado (`aws configure`)
- Dominio propio (opcional; CloudFront provee una URL por defecto)

---

## Paso 1 — Crear el bucket S3

```bash
# Reemplaza TU-BUCKET con un nombre único global
BUCKET="study-app-tu-nombre"
REGION="us-east-1"

aws s3 mb s3://$BUCKET --region $REGION
```

### Bloquear acceso público directo

CloudFront accederá al bucket como Origin Access Control (OAC), no como sitio web público.

```bash
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## Paso 2 — Subir los archivos

```bash
# Desde el directorio study-app/
aws s3 sync . s3://$BUCKET \
  --exclude ".git/*" \
  --exclude "tests/*" \
  --exclude "node_modules/*" \
  --exclude "*.test.js" \
  --delete
```

### Cache headers recomendados

```bash
# Archivos con hash (CSS, JS con versión) → cache largo
aws s3 cp assets/ s3://$BUCKET/assets/ \
  --recursive \
  --cache-control "public, max-age=31536000, immutable"

# HTML y manifests → sin cache (siempre verificar)
aws s3 cp index.html s3://$BUCKET/index.html \
  --cache-control "no-cache"

aws s3 cp manifest.webmanifest s3://$BUCKET/manifest.webmanifest \
  --cache-control "no-cache"

# Contenido JSON → cache corto (puede actualizarse)
aws s3 cp content/ s3://$BUCKET/content/ \
  --recursive \
  --cache-control "public, max-age=3600"
```

---

## Paso 3 — Crear distribución de CloudFront

### 3.1 Crear Origin Access Control

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "study-app-oac",
    "Description": "OAC para Study App",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }'
```

Anota el `Id` del OAC devuelto.

### 3.2 Crear la distribución

Crea `cloudfront-config.json`:

```json
{
  "CallerReference": "study-app-2026",
  "Comment": "Study App",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-study-app",
        "DomainName": "TU-BUCKET.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "OriginAccessControlId": "TU-OAC-ID"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-study-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  },
  "Enabled": true,
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100"
}
```

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

Anota el `DomainName` (ej: `abc123.cloudfront.net`) y el `Id` de la distribución.

### 3.3 Actualizar política del bucket S3

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::TU-BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::TU-CUENTA-ID:distribution/TU-DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket $BUCKET \
  --policy file://bucket-policy.json
```

---

## Paso 4 — HTTPS con AWS Certificate Manager (ACM)

> Solo necesario si tienes dominio propio. Si usas la URL de CloudFront, ya incluye HTTPS.

```bash
# ACM para CloudFront DEBE estar en us-east-1
aws acm request-certificate \
  --domain-name "studyapp.tudominio.com" \
  --validation-method DNS \
  --region us-east-1
```

1. Ve a la consola de ACM
2. Crea los registros CNAME de validación en tu DNS
3. Espera la validación (unos minutos)
4. Asocia el certificado en la distribución CloudFront

---

## Paso 5 — Route 53 (dominio personalizado)

```bash
# Crear zona hosted (si no existe)
aws route53 create-hosted-zone \
  --name tudominio.com \
  --caller-reference "study-app-$(date +%s)"
```

Crea un registro A de tipo Alias apuntando a CloudFront:

```json
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "studyapp.tudominio.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "abc123.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
```

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id TU-HOSTED-ZONE-ID \
  --change-batch file://route53-record.json
```

---

## Paso 6 — Invalidar caché de CloudFront al desplegar

Después de cada actualización de archivos, invalida el caché:

```bash
DISTRIBUTION_ID="TU-DISTRIBUTION-ID"

# Invalidar todo (primera vez o cambios mayores)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Invalidar solo index.html (despliegues frecuentes)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/index.html" "/sw.js" "/manifest.webmanifest"
```

---

## Script de despliegue completo

`deploy.sh`:

```bash
#!/bin/bash
set -e

BUCKET="study-app-tu-nombre"
DISTRIBUTION_ID="TU-DISTRIBUTION-ID"

echo "→ Subiendo archivos a S3..."
aws s3 sync . s3://$BUCKET \
  --exclude ".git/*" --exclude "tests/*" --exclude "docs/*" \
  --exclude "*.test.js" --exclude "deploy.sh" \
  --delete

echo "→ Invalidando caché de CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

echo "✓ Despliegue completado"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Troubleshooting

### La app devuelve 403 al navegar directamente a una ruta

**Causa:** CloudFront no sabe que `/certification/aws-saa` debe servir `index.html`.

**Solución:** En la distribución CloudFront, configurar **Custom Error Response**:
- Error code: `403`
- Response page path: `/index.html`
- HTTP response code: `200`

Study App usa hash routing (`#/ruta`) para evitar este problema, pero la configuración de error es un respaldo.

### El Service Worker no se actualiza

**Causa:** El browser sirve `sw.js` desde caché.

**Solución:** Invalida CloudFront para `/sw.js` después de cada deploy:
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/sw.js"
```

### Headers CSP bloquean recursos

Si usas CloudFront con Lambda@Edge o CloudFront Functions para agregar headers de seguridad, asegúrate de que el header `Content-Security-Policy` incluya:

```
default-src 'self';
style-src 'self';
script-src 'self';
img-src 'self' data: blob:;
connect-src 'self';
worker-src 'self';
```

### La PWA no se instala en subdominio

Asegúrate de que:
1. `manifest.webmanifest` tiene `"start_url": "./"` (relativo, no absoluto)
2. El MIME type de `manifest.webmanifest` en S3 es `application/manifest+json`

```bash
aws s3 cp manifest.webmanifest s3://$BUCKET/manifest.webmanifest \
  --content-type "application/manifest+json" \
  --cache-control "no-cache"
```

### CORS en S3 para módulos JSON

Si cargas contenido desde un bucket diferente, configura CORS en S3:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["https://studyapp.tudominio.com"],
    "ExposeHeaders": []
  }
]
```

```bash
aws s3api put-bucket-cors \
  --bucket $BUCKET \
  --cors-configuration file://cors.json
```

---

## Costos estimados (referencia)

| Servicio | Estimado mensual |
|---|---|
| S3 (< 1 GB) | < $0.05 |
| CloudFront (10 GB transferencia) | ~$0.85 |
| Route 53 (1 zona) | $0.50 |
| ACM | Gratis |
| **Total aproximado** | **< $2 / mes** |

Los costos varían según el tráfico. Para uso personal o equipos pequeños, los costos son mínimos.
