import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { HospitalService } from '../services/hospital.service';
import { Hospital } from '../models/hospital.model';

const PERU_CENTER: [number, number] = [-75.0152, -9.19];
const DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// TODO: reemplazar por la coordenada que devuelva el endpoint del backend
// una vez que se defina la lógica para la coleccion "minsa".
const MINSA_COORDS: [number, number] = [-77.040934, -12.073018];
const MINSA_NOMBRE = 'MINSA';

const DB_ICON_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="5" rx="8" ry="3" fill="#0a1420" stroke="#33e8ff" stroke-width="1.4"/>
  <path d="M4 5V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12V5" stroke="#33e8ff" stroke-width="1.4"/>
  <path d="M4 12V19C4 20.6569 7.58172 22 12 22C16.4183 22 20 20.6569 20 19V12" stroke="#33e8ff" stroke-width="1.4"/>
</svg>`;

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

  constructor(private hospitalService: HospitalService) {}

  ngAfterViewInit(): void {
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: DARK_STYLE_URL,
      center: PERU_CENTER,
      zoom: 5
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      this.renderMinsa();
      this.loadHospitales();
    });
  }

  ngOnDestroy(): void {
    this.markers.forEach((marker) => marker.remove());
    this.map?.remove();
  }

  private renderMinsa(): void {
    if (!this.map) {
      return;
    }

    const el = document.createElement('div');
    el.className = 'minsa-marker';
    el.innerHTML = `<span class="minsa-marker__pulse"></span><span class="minsa-marker__icon">${DB_ICON_SVG}</span>`;

    const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setText(MINSA_NOMBRE);

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(MINSA_COORDS)
      .setPopup(popup)
      .addTo(this.map);

    this.markers.push(marker);
  }

  private loadHospitales(): void {
    this.hospitalService.findAll().subscribe({
      next: (hospitales) => this.renderHospitales(hospitales),
      error: (err) => console.error('Error al obtener los hospitales', err)
    });
  }

  private renderHospitales(hospitales: Hospital[]): void {
    if (!this.map || hospitales.length === 0) {
      return;
    }

    const bounds = hospitales.reduce(
      (acc, h) => acc.extend([h.longitud, h.latitud]),
      new maplibregl.LngLatBounds().extend(MINSA_COORDS)
    );

    hospitales.forEach((hospital) => {
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
}
