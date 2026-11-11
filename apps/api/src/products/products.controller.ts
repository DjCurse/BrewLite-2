import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { RawListProductsQuery } from './dto/list-products-query';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** GET /products?page=1&pageSize=9&category=Matcha&q=latte */
  @Get()
  findAll(@Query() query: RawListProductsQuery) {
    return this.productsService.findAll(query);
  }

  /** GET /products/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
