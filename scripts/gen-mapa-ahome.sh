#!/bin/sh
# Regenera src/features/tablero/ahome.geo.json desde el Marco Geoestadístico 2024 de INEGI (Sinaloa).
# Recorta el municipio de Ahome (CVE_MUN 001) con sus AGEB urbanas y rurales, reproyecta a WGS84 y simplifica.
# Uso: sh scripts/gen-mapa-ahome.sh <carpeta-temporal-fuera-del-repo>
set -eu
TMP="$1"
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/features/tablero/ahome.geo.json"
URL=https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/marcogeo/794551132173/25_sinaloa.zip

mkdir -p "$TMP/shp"
cd "$TMP"
[ -f 25_sinaloa.zip ] || curl -fL -o 25_sinaloa.zip "$URL"
unzip -o -j -q 25_sinaloa.zip 'conjunto_de_datos/25mun.*' 'conjunto_de_datos/25a.*' 'conjunto_de_datos/25ar.*' -d shp

npx -y mapshaper@0.6 \
  -i combine-files shp/25mun.shp shp/25ar.shp shp/25a.shp \
  -filter "CVE_MUN=='001'" target=* \
  -each "tipo='municipio'" target=25mun \
  -each "tipo='rural'" target=25ar \
  -each "tipo='urbana'" target=25a \
  -filter-fields CVEGEO,tipo target=* \
  -rename-fields id=CVEGEO target=* \
  -merge-layers force target=* name=ahome \
  -proj wgs84 \
  -simplify 20% keep-shapes \
  -o "$OUT" format=geojson precision=0.00001
