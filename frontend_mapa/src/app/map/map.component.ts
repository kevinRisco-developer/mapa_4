import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { forkJoin } from 'rxjs';
import { HospitalService } from '../services/hospital.service';
import { MinsaService } from '../services/minsa.service';
import { TransaccionSocketService } from '../services/transaccion-socket.service';
import { Hospital } from '../models/hospital.model';
import { TransaccionEvento } from '../models/transaccion-evento.model';

type Coordenada = [number, number]; // [lng, lat]

const PERU_CENTER: Coordenada = [-75.0152, -9.19];
const DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const DB_ICON_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="5" rx="8" ry="3" fill="#0a1420" stroke="#33e8ff" stroke-width="1.4"/>
  <path d="M4 5V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12V5" stroke="#33e8ff" stroke-width="1.4"/>
  <path d="M4 12V19C4 20.6569 7.58172 22 12 22C16.4183 22 20 20.6569 20 19V12" stroke="#33e8ff" stroke-width="1.4"/>
</svg>`;

// ENVIO_HC: hospital -> MINSA (verde). CONSULTA_HC: MINSA -> hospital (naranja).
const ACCIONES: Record<string, { claseCss: string; color: string; sentido: 'hospital-minsa' | 'minsa-hospital' }> = {
  ENVIO_HC: { claseCss: 'estrella-fugaz--envio', color: '#2ee6a6', sentido: 'hospital-minsa' },
  CONSULTA_HC: { claseCss: 'estrella-fugaz--consulta', color: '#ff9d3d', sentido: 'minsa-hospital' }
};

const DURACION_ANIMACION_MS = 1400;

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map?: maplibregl.Map;
  private markers: maplibregl.Marker[] = [];
  private hospitalesPorId = new Map<string, Hospital>();
  private minsaCoords?: Coordenada;
  private animacionSeq = 0;

  constructor(
    private hospitalService: HospitalService,
    private minsaService: MinsaService,
    private transaccionSocket: TransaccionSocketService
  ) {}

  ngAfterViewInit(): void {
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: DARK_STYLE_URL,
      center: PERU_CENTER,
      zoom: 5
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    this.map.on('load', () => this.inicializar());
  }

  ngOnDestroy(): void {
    this.markers.forEach((marker) => marker.remove());
    this.map?.remove();
  }

  private inicializar(): void {
    forkJoin({
      minsa: this.minsaService.find(),
      hospitales: this.hospitalService.findAll()
    }).subscribe({
      next: ({ minsa, hospitales }) => {
        this.minsaCoords = [minsa.longitud, minsa.latitud];
        this.renderMinsa(this.minsaCoords, minsa.nombre);
        this.renderHospitales(hospitales);
        this.suscribirTransacciones();
      },
      error: (err) => console.error('Error al inicializar el mapa', err)
    });
  }

  private suscribirTransacciones(): void {
    this.transaccionSocket.onTransaccion().subscribe((evento) => this.manejarEvento(evento));
  }

  private manejarEvento(evento: TransaccionEvento): void {
    if (!this.minsaCoords) {
      return;
    }

    const hospital = this.hospitalesPorId.get(evento.id_hospital);
    if (!hospital) {
      console.warn('Evento de transaccion con hospital desconocido:', evento.id_hospital);
      return;
    }

    const config = ACCIONES[evento.accion];
    if (!config) {
      console.warn('Evento de transaccion con accion desconocida:', evento.accion);
      return;
    }

    const coordHospital: Coordenada = [hospital.longitud, hospital.latitud];
    const [origen, destino] = config.sentido === 'hospital-minsa'
      ? [coordHospital, this.minsaCoords]
      : [this.minsaCoords, coordHospital];

    this.lanzarEstrellaFugaz(origen, destino, config.claseCss, config.color);
  }

  private renderMinsa(coords: Coordenada, nombre: string): void {
    if (!this.map) {
      return;
    }

    const el = document.createElement('div');
    el.className = 'minsa-marker';
    el.innerHTML = `<span class="minsa-marker__pulse"></span><span class="minsa-marker__icon">${DB_ICON_SVG}</span>`;

    const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setText(nombre);

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(coords)
      .setPopup(popup)
      .addTo(this.map);

    this.markers.push(marker);
  }

  private renderHospitales(hospitales: Hospital[]): void {
    if (!this.map || hospitales.length === 0) {
      return;
    }

    this.hospitalesPorId.clear();

    const bounds = hospitales.reduce(
      (acc, h) => acc.extend([h.longitud, h.latitud]),
      new maplibregl.LngLatBounds().extend(this.minsaCoords!)
    );

    hospitales.forEach((hospital) => {
      this.hospitalesPorId.set(hospital.idHospital, hospital);

      const el = document.createElement('div');
      el.className = 'hospital-marker';

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setText(hospital.nombre);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([hospital.longitud, hospital.latitud])
        .setPopup(popup)
        .addTo(this.map!);

      this.markers.push(marker);
    });

    this.map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 0 });
  }

  private lanzarEstrellaFugaz(origen: Coordenada, destino: Coordenada, claseCss: string, color: string): void {
    if (!this.map) {
      return;
    }

    const id = `estrella-${this.animacionSeq++}`;
    const sourceId = `${id}-linea`;
    const layerId = `${id}-linea-layer`;

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [origen, destino] }
      }
    });

    this.map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': color,
        'line-width': 1.5,
        'line-opacity': 0.25
      }
    });

    // MapLibre posiciona este contenedor via style.transform (translate).
    // El punto que parpadea va en un hijo aparte: si el parpadeo animara
    // "transform" en el mismo elemento que mueve MapLibre, la animacion CSS
    // pisa el translate y el marcador queda pegado en una esquina.
    const el = document.createElement('div');
    el.className = 'estrella-fugaz-wrapper';

    const punto = document.createElement('div');
    punto.className = `estrella-fugaz ${claseCss}`;
    el.appendChild(punto);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(origen)
      .addTo(this.map);

    const inicio = performance.now();

    const animar = (ahora: number) => {
      const t = Math.min((ahora - inicio) / DURACION_ANIMACION_MS, 1);
      const lng = origen[0] + (destino[0] - origen[0]) * t;
      const lat = origen[1] + (destino[1] - origen[1]) * t;
      marker.setLngLat([lng, lat]);

      if (t < 1) {
        requestAnimationFrame(animar);
      } else {
        marker.remove();
        if (this.map?.getLayer(layerId)) {
          this.map.removeLayer(layerId);
        }
        if (this.map?.getSource(sourceId)) {
          this.map.removeSource(sourceId);
        }
      }
    };

    requestAnimationFrame(animar);
  }
}
