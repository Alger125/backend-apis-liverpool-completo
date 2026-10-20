import { Module } from "@nestjs/common";
import { HomeSearchService } from "./application/home-search.service";
import { SearchScopeEnforcer } from "./application/search-scope-enforcer.service";
import { HomeSearchController } from "./presentation/home-search.controller";

@Module({
  controllers: [HomeSearchController],
  providers: [HomeSearchService, SearchScopeEnforcer],
  exports: [HomeSearchService, SearchScopeEnforcer],
})
export class HomeSearchModule {}
