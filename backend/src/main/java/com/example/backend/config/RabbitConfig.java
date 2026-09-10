package com.example.backend.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Topologia de ingesta de transacciones de REPISE.
 * Una sola cola con un solo consumidor (ver spring.rabbitmq.listener.simple.concurrency=1)
 * para mantener orden FIFO global. Si el worker falla al insertar, el mensaje
 * se descarta con AmqpRejectAndDontRequeueException y RabbitMQ lo enruta
 * automaticamente a la dead-letter queue via x-dead-letter-exchange.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "transacciones.exchange";
    public static final String QUEUE = "transacciones.queue";
    public static final String ROUTING_KEY = "transacciones.insertar";

    public static final String DLX = "transacciones.dlx";
    public static final String DLQ = "transacciones.dlq";

    @Bean
    DirectExchange transaccionesExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    DirectExchange transaccionesDlx() {
        return new DirectExchange(DLX, true, false);
    }

    @Bean
    Queue transaccionesQueue() {
        return QueueBuilder.durable(QUEUE)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", ROUTING_KEY)
                .build();
    }

    @Bean
    Queue transaccionesDlq() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    Binding transaccionesBinding() {
        return BindingBuilder.bind(transaccionesQueue()).to(transaccionesExchange()).with(ROUTING_KEY);
    }

    @Bean
    Binding transaccionesDlqBinding() {
        return BindingBuilder.bind(transaccionesDlq()).to(transaccionesDlx()).with(ROUTING_KEY);
    }

    @Bean
    JacksonJsonMessageConverter jacksonJsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, JacksonJsonMessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }
}
