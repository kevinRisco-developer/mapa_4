package com.example.backend.transaccion;

import com.example.backend.config.RabbitConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Punto de ingesta para REPISE. No inserta directamente en Mongo: publica en
 * RabbitMQ (ver RabbitConfig) y responde de inmediato para no bloquear a REPISE
 * mientras el worker (TransaccionListener) procesa la cola en orden FIFO.
 */
@RestController
@RequestMapping("/api/transacciones")
public class TransaccionController {

    private final RabbitTemplate rabbitTemplate;

    public TransaccionController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping
    public ResponseEntity<Void> recibir(@RequestBody TransaccionRequest request) {
        if (!request.esValido()) {
            return ResponseEntity.badRequest().build();
        }

        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.ROUTING_KEY, request);
        return ResponseEntity.accepted().build();
    }
}
