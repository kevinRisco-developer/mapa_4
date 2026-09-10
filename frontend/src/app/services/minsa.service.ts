import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Minsa } from '../models/minsa.model';

@Injectable({ providedIn: 'root' })
export class MinsaService {
  private readonly baseUrl = `${environment.apiUrl}/minsa`;

  constructor(private http: HttpClient) {}

  find(): Observable<Minsa> {
    return this.http.get<Minsa>(this.baseUrl);
  }
}
