package com.example.backend.minsa;

import com.mongodb.client.MongoClient;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MinsaService {

    private static final String COLLECTION_NAME = "minsa";

    private final MongoClient mongoClient;
    private final String databaseName;

    public MinsaService(MongoClient mongoClient, @Value("${app.mongodb.database}") String databaseName) {
        this.mongoClient = mongoClient;
        this.databaseName = databaseName;
    }

    public Minsa find() {
        Document doc = mongoClient.getDatabase(databaseName).getCollection(COLLECTION_NAME).find().first();
        if (doc == null) {
            throw new IllegalStateException("No se encontro el documento de MINSA en la coleccion 'minsa'");
        }
        return new Minsa(doc.getString("nombre"), doc.getDouble("norte"), doc.getDouble("este"));
    }
}
