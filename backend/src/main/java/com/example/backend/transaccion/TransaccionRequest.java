package com.example.backend.transaccion;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TransaccionRequest(
        @JsonProperty("id_hospital") String idHospital,
        String accion
) {
    public boolean esValido() {
        return idHospital != null && !idHospital.isBlank()
                && accion != null && !accion.isBlank();
    }
}
