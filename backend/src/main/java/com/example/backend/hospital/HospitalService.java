package com.example.backend.hospital;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class HospitalService {

    private static final String COLLECTION_NAME = "hospitales";

    private final MongoClient mongoClient;
    private final String databaseName;

    public HospitalService(MongoClient mongoClient, @Value("${app.mongodb.database}") String databaseName) {
        this.mongoClient = mongoClient;
        this.databaseName = databaseName;
    }

    public List<Hospital> findAll() {
        MongoCollection<Document> collection = mongoClient.getDatabase(databaseName).getCollection(COLLECTION_NAME);
        List<Hospital> hospitales = new ArrayList<>();
        for (Document doc : collection.find()) {
            hospitales.add(new Hospital(
                    doc.getString("id_hospital"),
                    doc.getString("hospital"),
                    doc.getDouble("norte"),
                    doc.getDouble("este")
            ));
        }
        return hospitales;
    }
}
