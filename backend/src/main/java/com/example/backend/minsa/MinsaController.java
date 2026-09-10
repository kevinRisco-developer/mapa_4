package com.example.backend.minsa;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/minsa")
public class MinsaController {

    private final MinsaService minsaService;

    public MinsaController(MinsaService minsaService) {
        this.minsaService = minsaService;
    }

    @GetMapping
    public Minsa find() {
        return minsaService.find();
    }
}
