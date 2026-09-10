package com.example.backend.transaccion;

import com.example.backend.config.RabbitConfig;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Worker que consume la cola FIFO y hace el insert real en Mongo.
 * Si el insert falla, se relanza como AmqpRejectAndDontRequeueException:
 * RabbitMQ manda el mensaje a la dead-letter queue (transacciones.dlq) en vez
 * de perderlo o reintentarlo indefinidamente.
 */
@Component
public class TransaccionListener {

    private static final Logger log = LoggerFactory.getLogger(TransaccionListener.class);
    private static final String COLLECTION_NAME = "transacciones";

    private final MongoClient mongoClient;
    private final String databaseName;
    private final SimpMessagingTemplate messagingTemplate;

    public TransaccionListener(MongoClient mongoClient,
                                @Value("${app.mongodb.database}") String databaseName,
                                SimpMessagingTemplate messagingTemplate) {
        this.mongoClient = mongoClient;
        this.databaseName = databaseName;
        this.messagingTemplate = messagingTemplate;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void procesar(TransaccionRequest request) {
        try {
            MongoCollection<Document> collection = mongoClient.getDatabase(databaseName).getCollection(COLLECTION_NAME);
            Document doc = new Document("id_hospital", request.idHospital())
                    .append("accion", request.accion())
                    .append("fecha", Instant.now().toString());

            collection.insertOne(doc);

            messagingTemplate.convertAndSend("/topic/transacciones", request);
        } catch (Exception e) {
            log.error("Fallo al insertar transaccion de hospital {} en Mongo", request.idHospital(), e);
            throw new AmqpRejectAndDontRequeueException("Fallo al insertar transaccion en Mongo", e);
        }
    }
}
