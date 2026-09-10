import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Hospital } from '../models/hospital.model';

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private readonly baseUrl = `${environment.apiUrl}/hospitales`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(this.baseUrl);
  }
}
